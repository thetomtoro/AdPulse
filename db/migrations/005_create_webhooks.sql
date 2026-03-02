CREATE TABLE webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id),
  url VARCHAR(2048) NOT NULL,
  events VARCHAR(100)[] NOT NULL,
  secret VARCHAR(64) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_advertiser ON webhooks(advertiser_id);
CREATE INDEX idx_webhooks_active ON webhooks(active) WHERE active = true;
