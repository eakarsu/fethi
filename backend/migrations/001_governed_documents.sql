BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS platform_role TEXT NOT NULL DEFAULT 'member'
  CHECK (platform_role IN ('member', 'reviewer', 'admin'));

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matters (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  created_by BIGINT NOT NULL REFERENCES users(id),
  retention_until DATE,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS matter_members (
  matter_id BIGINT NOT NULL REFERENCES matters(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('viewer', 'editor', 'counsel', 'owner')),
  granted_by BIGINT NOT NULL REFERENCES users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  PRIMARY KEY (matter_id, user_id)
);

CREATE TABLE IF NOT EXISTS authoritative_templates (
  id BIGSERIAL PRIMARY KEY,
  source_name TEXT NOT NULL,
  external_id TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_version TEXT NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  content_sha256 TEXT NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source_name, external_id, source_version)
);

CREATE TABLE IF NOT EXISTS governed_documents (
  id BIGSERIAL PRIMARY KEY,
  matter_id BIGINT NOT NULL REFERENCES matters(id),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('contract', 'tax', 'claim', 'dispute', 'filing', 'other')),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'signature_pending', 'signed', 'filed', 'superseded', 'deleted')),
  current_version INTEGER NOT NULL DEFAULT 0,
  privileged BOOLEAN NOT NULL DEFAULT FALSE,
  template_id BIGINT REFERENCES authoritative_templates(id),
  created_by BIGINT NOT NULL REFERENCES users(id),
  retention_until DATE,
  legal_hold BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES governed_documents(id),
  version INTEGER NOT NULL,
  content TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('manual', 'upload', 'ocr', 'template', 'generated', 'redacted')),
  source_uri TEXT,
  source_sha256 TEXT,
  provider_request_id TEXT,
  model_name TEXT,
  prompt_version TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version)
);

CREATE TABLE IF NOT EXISTS document_reviews (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES governed_documents(id),
  version INTEGER NOT NULL,
  reviewer_id BIGINT NOT NULL REFERENCES users(id),
  jurisdiction TEXT NOT NULL,
  effective_date DATE NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested')),
  notes TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (document_id, version, reviewer_id)
);

CREATE TABLE IF NOT EXISTS signature_envelopes (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES governed_documents(id),
  version INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_envelope_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('created', 'sent', 'delivered', 'signed', 'declined', 'failed', 'voided')),
  signer_email TEXT NOT NULL,
  last_error TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS filing_submissions (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES governed_documents(id),
  version INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_submission_id TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('submitted', 'accepted', 'rejected', 'failed')),
  receipt_uri TEXT,
  last_error TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS document_archives (
  id BIGSERIAL PRIMARY KEY,
  document_id BIGINT NOT NULL REFERENCES governed_documents(id),
  version INTEGER NOT NULL,
  provider TEXT NOT NULL,
  provider_object_id TEXT NOT NULL UNIQUE,
  object_uri TEXT NOT NULL,
  content_sha256 TEXT NOT NULL,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_events (
  id BIGSERIAL PRIMARY KEY,
  matter_id BIGINT REFERENCES matters(id),
  actor_id BIGINT REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  previous_hash TEXT,
  event_hash TEXT NOT NULL UNIQUE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matter_members_active ON matter_members (matter_id, user_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_matter ON governed_documents (matter_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_versions_document ON document_versions (document_id, version DESC);
CREATE INDEX IF NOT EXISTS idx_audit_matter ON audit_events (matter_id, id);

CREATE OR REPLACE FUNCTION reject_audit_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are immutable';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_immutable ON audit_events;
CREATE TRIGGER audit_events_immutable
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION reject_audit_mutation();

INSERT INTO schema_migrations(version) VALUES ('001_governed_documents')
ON CONFLICT (version) DO NOTHING;

COMMIT;
