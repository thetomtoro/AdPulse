CREATE TABLE creatives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  name VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  weight INTEGER NOT NULL DEFAULT 50,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_creatives_campaign ON creatives(campaign_id);
CREATE INDEX idx_creatives_active ON creatives(campaign_id, status) WHERE status = 'ACTIVE';
