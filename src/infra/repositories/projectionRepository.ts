import {
  type DocumentData,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore';
import { z } from 'zod';

import {
  type RetirementAssumptions,
  createAssumptionsSchema,
} from '@/domains/retirement/assumptions';
import { type LifeEvent, LifeEventsSchema } from '@/domains/retirement/lifeEvents';
import {
  type ProjectionYearResult,
  type RuleSourceSnapshot,
} from '@/domains/retirement/logic/projectionTypes';
import {
  type ProjectionRule,
  ProjectionRulesSchema,
  RuleSourceType,
} from '@/domains/retirement/projectionRules';
import { db } from '@/firebase';
import { TimestampSchema } from '@/shared/schemas/date';

export const PROJECTION_DOCUMENT_MAX_BYTES = 900_000;

export type ProjectionDocumentName = 'main' | 'config' | 'source' | 'annual';

export type ProjectionWriteResult =
  | { ok: true; id: string }
  | { ok: false; code: 'PROJECTION_TOO_LARGE'; document: ProjectionDocumentName };

export interface ProjectionSummaryFields {
  retirementNetWorth: number | null;
  finalNetWorth: number;
  minNetWorth: number;
  minNetWorthYear: number | null;
  bankruptcyYear: number | null;
  isBankrupt: boolean;
}

export interface ProjectionDocument extends ProjectionSummaryFields {
  id: string;
  name: string;
  engineVersion: number;
  createdAt: Date;
  createdBy: string;
}

export interface ProjectionConfig {
  startYear: number;
  openingNetWorth: {
    amount: number;
    source: 'derived' | 'manual';
    anchorYearMonth?: string;
  };
  assumptions: RetirementAssumptions;
  projectionRules: ProjectionRule[];
  lifeEvents: LifeEvent[];
}

export interface ProjectionSource {
  ruleSources: RuleSourceSnapshot[];
}

export interface ProjectionAnnual {
  years: ProjectionYearResult[];
}

export interface CreateProjectionAtomicallyInput {
  householdId: string;
  projection: Omit<ProjectionDocument, 'id'>;
  config: ProjectionConfig;
  source: ProjectionSource;
  results: ProjectionAnnual;
}

const ProjectionYearResultSchema = z.object({
  year: z.number(),
  age: z.number(),
  isRetired: z.boolean(),
  opening: z.number(),
  return: z.number(),
  inflows: z.number(),
  outflows: z.number(),
  closing: z.number(),
});

const ProjectionSummarySchema = z.object({
  retirementNetWorth: z.number().nullable(),
  finalNetWorth: z.number(),
  minNetWorth: z.number(),
  minNetWorthYear: z.number().nullable(),
  bankruptcyYear: z.number().nullable(),
  isBankrupt: z.boolean(),
});

const ProjectionDocumentSchema = ProjectionSummarySchema.extend({
  name: z.string().trim().min(1),
  engineVersion: z.number(),
  createdAt: TimestampSchema,
  createdBy: z.string(),
});

const ProjectionSourceSchema = z.object({
  ruleSources: z.array(
    z.object({
      ruleId: z.string(),
      sourceType: RuleSourceType,
      sourceId: z.string(),
      baselineYear: z.number(),
      baselineAmount: z.number(),
    }),
  ),
});

const ProjectionAnnualSchema = z.object({
  years: z.array(ProjectionYearResultSchema),
});

function configSchema(currentYear: number) {
  return z
    .object({
      startYear: z.number(),
      openingNetWorth: z.object({
        amount: z.number(),
        source: z.enum(['derived', 'manual']),
        anchorYearMonth: z.string().optional(),
      }),
      assumptions: createAssumptionsSchema(currentYear),
      projectionRules: ProjectionRulesSchema,
      lifeEvents: LifeEventsSchema,
    })
    .superRefine((value, ctx) => {
      const hasAnchor = value.openingNetWorth.anchorYearMonth !== undefined;
      const isDerived = value.openingNetWorth.source === 'derived';

      if (isDerived && !hasAnchor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openingNetWorth', 'anchorYearMonth'],
          message: 'ANCHOR_REQUIRED',
        });
      }
      if (!isDerived && hasAnchor) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['openingNetWorth', 'anchorYearMonth'],
          message: 'ANCHOR_FORBIDDEN',
        });
      }
    });
}

const currentYear = (): number => new Date().getFullYear();

const byteLength = (value: unknown): number =>
  new TextEncoder().encode(JSON.stringify(value)).length;

function sanitize(value: unknown): unknown {
  if (value === undefined) return undefined;

  if (value instanceof Date) return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitize(item)).filter((item) => item !== undefined);
  }

  if (typeof value === 'object' && value !== null) {
    const entries = Object.entries(value)
      .map(([key, entry]) => [key, sanitize(entry)] as const)
      .filter(([, entry]) => entry !== undefined);

    return Object.fromEntries(entries);
  }

  return value;
}

function fromFirestore(data: DocumentData): unknown {
  if (data instanceof Timestamp) return data.toDate();
  if (data instanceof Date) return data;
  if (Array.isArray(data)) return data.map((entry) => fromFirestore(entry));
  if (data && typeof data === 'object') {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, fromFirestore(value)]),
    );
  }
  return data;
}

class ProjectionRepository {
  private readonly collectionName = 'projections';

  private getCollectionRef(householdId: string) {
    return collection(this.db, 'households', householdId, this.collectionName);
  }

  private getDocRef(householdId: string, projectionId: string) {
    return doc(this.db, 'households', householdId, this.collectionName, projectionId);
  }

  private getConfigRef(householdId: string, projectionId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      this.collectionName,
      projectionId,
      'snapshots',
      'config',
    );
  }

  private getSourceRef(householdId: string, projectionId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      this.collectionName,
      projectionId,
      'snapshots',
      'source',
    );
  }

  private getAnnualRef(householdId: string, projectionId: string) {
    return doc(
      this.db,
      'households',
      householdId,
      this.collectionName,
      projectionId,
      'results',
      'annual',
    );
  }

  async createProjectionAtomically(
    input: CreateProjectionAtomicallyInput,
  ): Promise<ProjectionWriteResult> {
    const { householdId, projection, config, source, results } = input;

    const projectionRef = doc(this.getCollectionRef(householdId));
    const projectionId = projectionRef.id;

    const mainPayload = sanitize({
      ...projection,
      createdAt: Timestamp.fromDate(projection.createdAt),
    }) as DocumentData;
    const configPayload = sanitize(config) as DocumentData;
    const sourcePayload = sanitize(source) as DocumentData;
    const annualPayload = sanitize(results) as DocumentData;

    const documents: Array<[ProjectionDocumentName, DocumentData]> = [
      ['main', mainPayload],
      ['config', configPayload],
      ['source', sourcePayload],
      ['annual', annualPayload],
    ];

    for (const [document, payload] of documents) {
      if (byteLength(payload) > PROJECTION_DOCUMENT_MAX_BYTES) {
        return { ok: false, code: 'PROJECTION_TOO_LARGE', document };
      }
    }

    const batch = writeBatch(this.db);
    batch.set(projectionRef, mainPayload);
    batch.set(this.getConfigRef(householdId, projectionId), configPayload);
    batch.set(this.getSourceRef(householdId, projectionId), sourcePayload);
    batch.set(this.getAnnualRef(householdId, projectionId), annualPayload);
    await batch.commit();

    return { ok: true, id: projectionId };
  }

  /** Children first, then the main document, in one batch. Hard delete. */
  async deleteProjection(householdId: string, projectionId: string): Promise<void> {
    const batch = writeBatch(this.db);
    batch.delete(this.getAnnualRef(householdId, projectionId));
    batch.delete(this.getSourceRef(householdId, projectionId));
    batch.delete(this.getConfigRef(householdId, projectionId));
    batch.delete(this.getDocRef(householdId, projectionId));
    await batch.commit();
  }

  async getProjection(
    householdId: string,
    projectionId: string,
  ): Promise<ProjectionDocument | null> {
    const snapshot = await getDoc(this.getDocRef(householdId, projectionId));
    if (!snapshot.exists()) return null;

    const parsed = ProjectionDocumentSchema.parse(fromFirestore(snapshot.data()));
    return { ...parsed, id: snapshot.id };
  }

  async listProjections(householdId: string): Promise<ProjectionDocument[]> {
    const snapshot = await getDocs(
      query(this.getCollectionRef(householdId), orderBy('createdAt', 'desc')),
    );

    return snapshot.docs.map((entry) => ({
      ...ProjectionDocumentSchema.parse(fromFirestore(entry.data())),
      id: entry.id,
    }));
  }

  async getProjectionConfig(
    householdId: string,
    projectionId: string,
  ): Promise<ProjectionConfig | null> {
    const snapshot = await getDoc(this.getConfigRef(householdId, projectionId));
    if (!snapshot.exists()) return null;

    return configSchema(currentYear()).parse(fromFirestore(snapshot.data()));
  }

  async getProjectionSource(
    householdId: string,
    projectionId: string,
  ): Promise<ProjectionSource | null> {
    const snapshot = await getDoc(this.getSourceRef(householdId, projectionId));
    if (!snapshot.exists()) return null;

    return ProjectionSourceSchema.parse(fromFirestore(snapshot.data()));
  }

  async getProjectionAnnual(
    householdId: string,
    projectionId: string,
  ): Promise<ProjectionAnnual | null> {
    const snapshot = await getDoc(this.getAnnualRef(householdId, projectionId));
    if (!snapshot.exists()) return null;

    return ProjectionAnnualSchema.parse(fromFirestore(snapshot.data()));
  }

  protected readonly db = db;
}

export const projectionRepository = new ProjectionRepository();
