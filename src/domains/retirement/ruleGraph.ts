export interface RuleGraphNode {
  id: string;
  source?: { type: string; id: string };
}

export type RuleGraphError =
  | { code: 'CYCLE'; ruleIds: string[] }
  | { code: 'DANGLING_REFERENCE'; ruleId: string; targetId: string };

export type RuleGraphResult =
  | { ok: true; order: string[] }
  | { ok: false; errors: RuleGraphError[] };

function ruleRefs(rule: RuleGraphNode): string[] {
  return rule.source?.type === 'rule' ? [rule.source.id] : [];
}

/**
 * Pure topological order over rule references. Disabled rules participate:
 * they still need a position and can be referenced (value 0).
 */
export function resolveRuleGraph(rules: readonly RuleGraphNode[]): RuleGraphResult {
  const byId = new Map(rules.map((rule) => [rule.id, rule]));
  const errors: RuleGraphError[] = [];

  for (const rule of rules) {
    for (const targetId of ruleRefs(rule)) {
      if (!byId.has(targetId)) {
        errors.push({
          code: 'DANGLING_REFERENCE',
          ruleId: rule.id,
          targetId,
        });
      }
    }
  }

  const indegree = new Map<string, number>(rules.map((rule) => [rule.id, 0]));
  const dependents = new Map<string, string[]>();

  for (const rule of rules) {
    for (const targetId of ruleRefs(rule)) {
      if (!byId.has(targetId)) continue;
      indegree.set(rule.id, (indegree.get(rule.id) ?? 0) + 1);
      const list = dependents.get(targetId) ?? [];
      list.push(rule.id);
      dependents.set(targetId, list);
    }
  }

  const queue = rules.map((rule) => rule.id).filter((id) => (indegree.get(id) ?? 0) === 0);
  const order: string[] = [];

  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    order.push(id);
    for (const dependent of dependents.get(id) ?? []) {
      const next = (indegree.get(dependent) ?? 0) - 1;
      indegree.set(dependent, next);
      if (next === 0) queue.push(dependent);
    }
  }

  if (order.length !== rules.length) {
    const remaining = new Set(rules.map((rule) => rule.id).filter((id) => !order.includes(id)));
    errors.push(...findCycles(remaining, byId));
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, order };
}

function walkCycle(
  startId: string,
  remaining: Set<string>,
  byId: Map<string, RuleGraphNode>,
): string[] | undefined {
  const path: string[] = [];
  const position = new Map<string, number>();
  let currentId: string | undefined = startId;

  while (currentId !== undefined && !position.has(currentId)) {
    position.set(currentId, path.length);
    path.push(currentId);
    currentId = ruleRefs(byId.get(currentId) ?? { id: currentId }).find((targetId) =>
      remaining.has(targetId),
    );
  }

  if (currentId === undefined) return undefined;
  return [...path.slice(position.get(currentId)), currentId];
}

function findCycles(remaining: Set<string>, byId: Map<string, RuleGraphNode>): RuleGraphError[] {
  const errors: RuleGraphError[] = [];
  const seen = new Set<string>();

  for (const startId of remaining) {
    if (seen.has(startId)) continue;

    const cycle = walkCycle(startId, remaining, byId);
    if (cycle === undefined) continue;

    errors.push({ code: 'CYCLE', ruleIds: cycle });
    for (const id of cycle) seen.add(id);
  }

  return errors;
}
