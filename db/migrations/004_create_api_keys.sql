CREATE TABLE api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id),
  key_prefix VARCHAR(8) NOT NULL,
  key_hash VARCHAR(64) NOT NULL UNIQUE,
  scopes VARCHAR(50)[] NOT NULL DEFAULT '{"read","write"}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_keys_advertiser ON api_keys(advertiser_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);
