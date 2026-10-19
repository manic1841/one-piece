# Firestore create-only rules and batch limits

Research for issue #320. Primary sources only; every claim carries its URL and section heading.
Scope: how Firestore Security Rules express "immutable after creation" for a main document plus
nested subcollection documents, how that composes with the existing catch-all write rule, and the
documented limits around a ~4-document write plus later reads.

## TL;DR

1. Overlapping `match` statements are **additive (OR only)**. A specific rule can grant what the
   wildcard denies; it cannot revoke what the wildcard grants. `allow update: if false` inside a
   nested match is a no-op while the catch-all still says `allow write: if <admin>`.
2. The only working shape is: make the wildcard's `allow write` **exclude** the frozen path, then add
   a specific rule with `allow create` + `allow delete` and no update.
3. Limits are orders of magnitude beyond a 4-document transaction: 500 writes per batch/transaction,
   10 MiB request, 1 MiB per document, 100 subcollection levels.

## 1. Precedence: a specific match does not override a recursive wildcard

Firestore has no `deny`. Every matching `allow` is evaluated and the request succeeds if any one of
them is `true`.

> "It's possible for a document to match more than one `match` statement. In the case where multiple
> `allow` expressions match a request, the access is allowed if any of the conditions is `true`."
> — https://firebase.google.com/docs/firestore/security/rules-structure, § Overlapping match statements

That page proves it: a specific `match /cities/{city}` with `allow read, write: if false` placed
*before* `match /cities/{document=**}` with `allow read, write: if true` leaves every city writable.
Order is irrelevant; the `false` is swallowed.

Two consequences that matter here:

- `write` is a shorthand equivalent to OR-ing `create`, `update` and `delete`. Only the granular names
  distinguish the three cases:
  > "A `write` rule can be broken into `create`, `update`, and `delete` … Applies to writes to
  > nonexistent documents / existing documents / delete operations"
  > — same page, § Granular operations
- Nested `match` paths are relative to the parent and `{x=**}` captures the whole remaining path, so
  `retirement_plans/{planId}` and `retirement_plans/{planId}/incomeStreams/{id}` both hit the
  catch-all. Subcollections are never covered by the parent rule on their own.
  > — same page, § Hierarchical data and § Recursive wildcards

### Why the obvious patch fails

With the current catch-all (firestore.rules:63-66)

```
match /{allSubcollections=**} {
  allow write: if isGlobalAdmin() || (isSystemUser() && isHouseholdAdmin(householdId));
}
```

adding

```
match /retirement_plans/{planId} { allow update: if false; }
```

still permits updates: the wildcard's `allow write` matches the same document and returns `true`, and
OR wins.

### Value-level alternative (only works with a conditional wildcard)

Field-diff guards do not fix precedence by themselves; they are useful when the wildcard itself asks
the question. They also accept a rewrite with identical values as a legal update.

> "To prevent some fields from being changed … `affectedKeys().hasAny([...])`"
> — https://firebase.google.com/docs/firestore/security/rules-fields, § Preventing some fields from being changed

## 2. Correct syntax

Exclude the frozen subtree in the wildcard, keyed on the captured remainder. `split()` takes an RE2
regex and list indexing is `[0]`, so the first path segment identifies the subtree.

> `rules.String.split(regex)` / `rules.String.matches(regex)` — https://firebase.google.com/docs/reference/rules/rules.String

```
function isFrozen(path) {
  return path.split('/')[0] == 'retirement_plans';
}

match /{allSubcollections=**} {
  allow read: if isGlobalAdmin() || (isSystemUser() && isHouseholdMember(householdId));
  allow write: if (isGlobalAdmin() || (isSystemUser() && isHouseholdAdmin(householdId)))
               && !isFrozen(allSubcollections);
}

match /retirement_plans/{planId} {
  allow create: if isGlobalAdmin() || (isSystemUser() && isHouseholdAdmin(householdId));
  allow update: if false;
  allow delete: if isGlobalAdmin() || (isSystemUser() && isHouseholdAdmin(householdId));

  match /{child=**} {
    allow create: if isGlobalAdmin() || (isSystemUser() && isHouseholdAdmin(householdId));
    allow update: if false;
    allow delete: if isGlobalAdmin() || (isSystemUser() && isHouseholdAdmin(householdId));
  }
}
```

Notes:

- Reads remain untouched: the subtree still resolves through the wildcard's `allow read`.
- `set()` on an existing document is an `update`, so it is rejected — "create-only" holds.
- `{child=**}` inherits the freeze to any future subcollection, not just today's two.
- Deleting a plan does not cascade; each child delete is its own request and its own check.
- Depth `databases/documents` → `households/{id}` → `retirement_plans/{planId}` → `{child=**}` is far
  under the 20-nested-match limit (§ 3).
- A strict freeze breaks the current write path: `createPlanAtomically` also `tx.update`s sibling plans
  to `isActive: false`. Either drop that demotion, or relax the main-doc rule to
  `allow update: if <admin> && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isActive','updatedAt','updatedBy'])`
  and keep `allow update: if false` on children.

## 3. Documented hard limits

Subcollection documents are ordinary documents, and every `set`, `update` or `delete` counts on its
own:

> "a batched write is a set of write operations on one or more documents"
> "Each operation in the batch counts separately towards your Cloud Firestore usage."
> — https://firebase.google.com/docs/firestore/manage-data/transactions, § Batched writes

> "The maximum number of writes allowed in a single `WriteBatch` is 500, but note that each usage of
> `FieldValue.serverTimestamp()`, `FieldValue.arrayUnion()`, `FieldValue.arrayRemove()`, or
> `FieldValue.increment()` inside a `WriteBatch` counts as an additional write."
> — https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Firestore, § batch

> "The maximum number of writes allowed in a single transaction is 500, but note that each usage of …
> inside a transaction counts as an additional write."
> — same page, § runTransaction

> "Maximum API request size | 10 MiB", "Time limit for a transaction | 270 seconds"
> — https://docs.cloud.google.com/firestore/quotas, § Writes and transactions

> "Maximum size for a document | 1 MiB (1,048,576 bytes)", "Maximum size of a field value |
> 1 MiB - 89 bytes", "Maximum depth of subcollections | 100"
> — same page, § Collections, documents, and fields

Rules-side evaluation limits (a wrapper must not balloon them):

> 10 document access calls per single-document request, 20 per multi-document request (batch,
> transaction), 20 nested `match` statements, 100 path segments, 20 path capture variables, 1,000
> expressions
> — https://firebase.google.com/docs/firestore/security/rules-structure, § Security rule limits
> (mirrored at https://docs.cloud.google.com/firestore/quotas, § Security rules)

Budget: a 4-document transaction is 4 writes, 4 evaluated operations and — because
`isHouseholdAdmin()` performs one `get()` per write — roughly 4 cached document accesses, far below
500 / 20. Reads afterwards add one `get()` per document fetched.

## 4. How this applies to `retirement_plans`

- The collection ID is `retirement_plans` (snake_case), not `retirementPlans`. Children are
  `incomeStreams` and `expenseCategories` under `households/{householdId}/retirement_plans/{planId}`
  (`src/infra/repositories/retirementSubcollectionHelpers.ts`).
- `firestore.rules` has no retirement-specific rule today; plan and child writes pass through the
  catch-all, so a nested match alone changes nothing (§ 1).
- `createPlanAtomically` (`src/infra/repositories/retirementRepository.ts:96-130`) is a
  `runTransaction` with 1 plan + N incomes + M expenses → ~4 writes, plus the sibling `isActive`
  updates. Within limits.
- `src/test/firestoreRules.integration.test.ts` loads the real rules via `initializeTestEnvironment`
  and asserts an authorization matrix, but has no retirement cases. Add, per identity (member,
  household admin, household owner, global admin), for both a plan and one child: create allowed for
  admin, update denied for admin, delete allowed for admin, create denied for plain member. Cover a
  second collection too, to prove the exclusion is path-scoped and not subtree-wide.

## Sources

- https://firebase.google.com/docs/firestore/security/rules-structure — § Overlapping match
  statements, § Granular operations, § Hierarchical data, § Recursive wildcards, § Security rule limits
- https://firebase.google.com/docs/firestore/security/rules-fields — § Preventing some fields from being changed
- https://firebase.google.com/docs/reference/rules/rules.String — `split`, `matches`
- https://firebase.google.com/docs/firestore/manage-data/transactions — § Batched writes
- https://firebase.google.com/docs/reference/js/v8/firebase.firestore.Firestore — § batch, § runTransaction
- https://docs.cloud.google.com/firestore/quotas — § Writes and transactions, § Collections, documents, and fields, § Security rules
