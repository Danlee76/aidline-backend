CREATE TABLE sponsor_pool_deposits (
  event_id TEXT PRIMARY KEY, ledger INTEGER NOT NULL, tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, campaign_id BIGINT NOT NULL REFERENCES campaigns(id),
  sponsor TEXT NOT NULL, amount NUMERIC(39,0) NOT NULL, ratio_bps INTEGER NOT NULL,
  cap NUMERIC(39,0) NOT NULL
);
CREATE TABLE sponsor_pool_matches (
  event_id TEXT PRIMARY KEY, ledger INTEGER NOT NULL, tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, campaign_id BIGINT NOT NULL REFERENCES campaigns(id),
  sponsor TEXT NOT NULL, donor TEXT NOT NULL, donation_amount NUMERIC(39,0) NOT NULL,
  matched_amount NUMERIC(39,0) NOT NULL
);
CREATE TABLE sponsor_pool_returns (
  event_id TEXT PRIMARY KEY, ledger INTEGER NOT NULL, tx_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL, campaign_id BIGINT NOT NULL REFERENCES campaigns(id),
  sponsor TEXT NOT NULL, amount NUMERIC(39,0) NOT NULL
);
CREATE INDEX sponsor_pool_deposits_campaign_idx ON sponsor_pool_deposits(campaign_id);
CREATE INDEX sponsor_pool_matches_campaign_idx ON sponsor_pool_matches(campaign_id);
CREATE INDEX sponsor_pool_returns_campaign_idx ON sponsor_pool_returns(campaign_id);
