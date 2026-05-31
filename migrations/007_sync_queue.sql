DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_operation') THEN
    CREATE TYPE sync_operation AS ENUM ('INSERT', 'UPDATE', 'DELETE');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS sync_queue (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_cible VARCHAR(50) NOT NULL,
  record_id   UUID NOT NULL,
  operation   sync_operation NOT NULL,
  payload     JSONB NOT NULL,
  agent_id    UUID REFERENCES agents(id),
  synced_at   TIMESTAMP,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_synced ON sync_queue(synced_at);
CREATE INDEX IF NOT EXISTS idx_sync_agent  ON sync_queue(agent_id);
