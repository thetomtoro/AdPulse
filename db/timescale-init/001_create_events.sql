CREATE TABLE ad_events (
  id UUID NOT NULL,
  event_type VARCHAR(20) NOT NULL,
  campaign_id UUID NOT NULL,
  creative_id UUID NOT NULL,
  request_id UUID NOT NULL,
  publisher_id UUID NOT NULL,
  user_id_hash VARCHAR(64),
  geo_country VARCHAR(3),
  geo_region VARCHAR(10),
  device_type VARCHAR(20),
  bid_price_cpm INTEGER,
  timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB DEFAULT '{}'
);

SELECT create_hypertable('ad_events', 'timestamp');

CREATE INDEX idx_events_campaign_time ON ad_events(campaign_id, timestamp DESC);
CREATE INDEX idx_events_type_time ON ad_events(event_type, timestamp DESC);

-- Continuous aggregate for hourly campaign stats
CREATE MATERIALIZED VIEW campaign_stats_hourly
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', timestamp) AS bucket,
  campaign_id,
  creative_id,
  event_type,
  COUNT(*) AS event_count,
  SUM(CASE WHEN event_type = 'IMPRESSION' THEN bid_price_cpm ELSE 0 END) AS spend_micros,
  COUNT(DISTINCT user_id_hash) AS unique_users
FROM ad_events
GROUP BY bucket, campaign_id, creative_id, event_type;

SELECT add_continuous_aggregate_policy('campaign_stats_hourly',
  start_offset => INTERVAL '3 hours',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '5 minutes');
