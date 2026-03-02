CREATE TABLE campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id),
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  objective VARCHAR(30) NOT NULL,
  budget JSONB NOT NULL,
  schedule JSONB NOT NULL,
  targeting JSONB NOT NULL,
  compliance JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_advertiser ON campaigns(advertiser_id);
CREATE INDEX idx_campaigns_status ON campaigns(status);
CREATE INDEX idx_campaigns_active ON campaigns(status, (schedule->>'startDate'), (schedule->>'endDate'))
  WHERE status = 'ACTIVE';
