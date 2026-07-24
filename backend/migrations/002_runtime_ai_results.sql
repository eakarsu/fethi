BEGIN;
CREATE TABLE IF NOT EXISTS runtime_ai_results (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  input JSONB NOT NULL,
  output TEXT NOT NULL,
  model TEXT NOT NULL,
  provider_response_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS runtime_ai_results_user_created_idx
  ON runtime_ai_results(user_id, created_at DESC);
COMMIT;
