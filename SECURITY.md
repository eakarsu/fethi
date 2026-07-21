# Security and operations

## Credential response

The former local `backend/.env` contains development-looking secrets. It is ignored now, but ignoring a file does not remove a secret from history. Before any shared deployment, inspect all branches and tags with a secret scanner, revoke every discovered credential at its provider, issue replacements, and remove the historical material using the repository owner's approved history-rewrite process. Do not reuse the checked-in examples.

The API refuses weak or missing JWT secrets. Keep production secrets in a managed secret store, use a different database role per environment, and restrict `CORS_ORIGINS` to the deployed web origins.

## Controlled data operations

`npm run migrate` is the only schema migration command. Startup does not seed, drop, create, or overwrite a database. `npm run seed:demo` is destructive demo tooling and must never target shared or production data.

The start script does not kill unrelated processes or start operating-system services. Dependency installation and migrations are opt-in through `INSTALL_DEPENDENCIES=1` and `RUN_MIGRATIONS=1`.

## External document services

OCR, signature, filing, storage, and authoritative-template calls require the URL/token pairs documented in `.env.example`. Missing configuration returns `503`; provider failures return `502`. No operation fabricates a successful external status. E-sign callbacks require an HMAC-SHA256 `x-webhook-signature` computed over the exact request body.

Generated document versions must include `modelName` and `promptVersion`. They remain drafts until a matter member with `counsel` access verifies the jurisdiction and effective date and records a human decision.
