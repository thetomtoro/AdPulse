CREATE TABLE attribution_touchpoints (
  conversion_id UUID NOT NULL,
  event_id UUID NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  campaign_id UUID NOT NULL,
  creative_id UUID NOT NULL,
  user_id_hash VARCHAR(64) NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  conversion_value INTEGER,
  attribution_model VARCHAR(30),
  credit DECIMAL(5,4),
  PRIMARY KEY (conversion_id, event_id)
);

SELECT create_hypertable('attribution_touchpoints', 'timestamp');
