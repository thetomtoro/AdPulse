CREATE TABLE advertisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key_hash VARCHAR(64) NOT NULL UNIQUE,
  rate_limit_rps INTEGER NOT NULL DEFAULT 100,
  compliance_defaults JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
