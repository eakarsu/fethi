# Completeness Review: fethi

**Review date:** 2026-07-18

## Assessment basis

Static inspection of project-owned source and configuration only; no dependency installation, build, database migration, external-service call, or runtime launch was performed. The scan considered 74 project files (63 source files), 2 manifest(s), 0 test-like file(s), and 0 CI workflow(s), excluding dependency/generated directories.

## Classification

**Prototype-demo**

This is a prototype/demo for legal/document workflow. Generated gap/demo patterns are present: it contains 63 source files and visible routes/pages in `frontend/`, `backend/`, but those surfaces are not evidence of durable domain execution, verified integrations, or operational completion.

## Why it is not complete

- Generated gap/visualization routes describe missing capabilities or simulate recommendations; they do not implement the underlying domain operation.
- Generic LLM calls are used as product behavior without enough typed tools, grounded evidence, deterministic rules, or output evaluation.
- Mock, demo, sample, fixture, or placeholder behavior remains in executable/product paths.
- No recognizable project-owned automated tests were found for the main workflow.
- No checked-in CI workflow proves builds, tests, migrations, and security checks on every change.

## Needed features

1. Add matter-scoped permissions, document provenance, version history, privileged-access controls, and immutable audit events.
2. Integrate OCR, e-signature, filing/storage, retention/legal-hold, and authoritative template sources.
3. Require human legal review and jurisdiction/effective-date validation for generated clauses, forms, or recommendations.
4. Test redaction, conflicting versions, signer failure, access revocation, export, and retention workflows end to end.
5. Add risk-based unit, integration, and end-to-end tests in CI, including migration and failure-path coverage.

## Risks or launch blockers

- Credential/configuration exposure: environment files are present in the repository tree and must be checked against Git history and rotated if real.
- Weak/fallback secret patterns can permit forged sessions or accidental insecure deployments.
- Automation contains destructive process, filesystem, or database operations; do not run it on a shared machine without review.
- Startup appears coupled to seed/migration behavior, risking data mutation or non-repeatable launches.

## Evidence inspected

- `backend/middleware/auth.js:4`
- `frontend/src/App.jsx:19`
- `backend/server.js`
- `backend/middleware/auth.js`
- `backend/package.json`
- `start.sh`

## Recommended next action

Stop adding generated pages; prove one legal/document workflow workflow against real services and persistent state, with tests and measurable acceptance criteria.

## Implementation progress (2026-07-19)

Implemented every source-actionable review item, adapting the review's mistaken "legal workflow" classification to this repository's actual rental-contract, claim, dispute, tax-document, and filing domain:

- Added a user-facing governed-document workspace and persistent API for matter-scoped, revocable viewer/editor/counsel/owner access; privileged-document filtering; immutable document versions; optimistic version-conflict detection; exact-term redaction; SHA-256 provenance; generated-draft model/prompt provenance; jurisdiction/effective-date human review; export evidence bundles; and retention/legal-hold enforcement.
- Added authoritative-template, OCR, e-signature, object-storage, and filing adapters backed only by configured provider HTTP APIs. Missing credentials fail closed with `503`, provider failures return `502`, incomplete responses are rejected, and e-sign callbacks require an HMAC over the exact body. No provider success is simulated.
- Added durable signature, archive, and filing records plus a database-enforced append-only, hash-chained audit log. Audit mutation is rejected by a PostgreSQL trigger and the API verifies the complete chain before returning matter audit evidence.
- Removed generic OpenRouter/gap endpoints from the running server and removed all generated recommendation, comparison, pricing, assistant, and Batch09 gap pages from reachable frontend routes. Existing old source files are inert and can be removed separately after history owners confirm they are not needed.
- Replaced fallback JWT secrets with a required 32+ character secret, pinned JWT algorithm/issuer/audience, shortened token life, added platform roles, validated registration input, restricted CORS, added response security headers and request-size limits, and fixed cross-user booking reads/mutations, invalid booking transitions, overlapping/self-bookings, and an interpolated service-request status update.
- Added nondestructive baseline/governance migrations and decoupled migration, dependency installation, and demo seeding from startup. `start.sh` no longer kills arbitrary port owners, starts OS services, creates databases, installs packages, or reseeds data unless the explicitly documented opt-in flags are supplied.
- Added CI with PostgreSQL 16, clean dependency installs, migrations, 22 project-owned unit/integration tests, a production frontend build, and high-severity dependency audits. Local verification repeated the migration on a uniquely named fresh disposable PostgreSQL database and passed all 22 tests with no skips; the Vite 8 production build passed; backend and frontend audits both report zero vulnerabilities; shell syntax and JavaScript syntax checks passed.

External launch blockers remain honest and explicit: production OCR, e-signature, filing, object-storage, and authoritative-template workflows require provider URLs/tokens and provider contract validation; no live third-party calls were possible without those credentials. Independent verification subsequently scanned all Git refs and the current tree with redaction enabled; Gitleaks reported no findings. Any separately stored or previously distributed real credentials still remain the provider owners' rotation responsibility, because source changes cannot revoke them.
