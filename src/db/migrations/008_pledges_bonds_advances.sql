CREATE TABLE pledges (
  pledge_id BIGINT PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns (id),
  donor TEXT NOT NULL,
  pledged_amount NUMERIC(39, 0) NOT NULL,
  pulled_amount NUMERIC(39, 0) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pulled', 'skipped', 'settled')),
  skipped_reason INTEGER,
  settled_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX pledges_campaign_idx ON pledges (campaign_id, updated_at DESC);
CREATE INDEX pledges_donor_idx ON pledges (donor, updated_at DESC);

CREATE TABLE pledge_events (
  event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, pledge_id BIGINT,
  campaign_id BIGINT NOT NULL REFERENCES campaigns (id), donor TEXT NOT NULL,
  amount NUMERIC(39, 0), reason INTEGER, milestone_index INTEGER,
  ledger INTEGER NOT NULL, tx_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX pledge_events_campaign_idx ON pledge_events (campaign_id, created_at DESC);

CREATE TABLE verifier_bond_events (
  event_id TEXT PRIMARY KEY, event_type TEXT NOT NULL, verifier TEXT NOT NULL,
  campaign_id BIGINT, amount NUMERIC(39, 0), ledger INTEGER NOT NULL,
  tx_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL
);
ALTER TABLE verifiers ADD COLUMN bond_amount NUMERIC(39, 0) NOT NULL DEFAULT 0;
ALTER TABLE verifiers ADD COLUMN ever_slashed BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE verifiers ADD COLUMN deregistered_at TIMESTAMPTZ;

CREATE TABLE emergency_advances (
  event_id TEXT PRIMARY KEY, campaign_id BIGINT NOT NULL REFERENCES campaigns (id),
  verifier TEXT NOT NULL, milestone_index INTEGER NOT NULL, amount NUMERIC(39, 0) NOT NULL,
  ledger INTEGER NOT NULL, tx_hash TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX emergency_advances_campaign_idx ON emergency_advances (campaign_id, created_at DESC);
