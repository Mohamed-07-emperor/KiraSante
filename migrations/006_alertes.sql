DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_alerte') THEN
    CREATE TYPE statut_alerte AS ENUM ('active', 'resolue', 'en_cours');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS alertes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type_alerte    VARCHAR(100) NOT NULL,
  district_id    UUID REFERENCES districts(id),
  latitude       DECIMAL(10,8),
  longitude      DECIMAL(11,8),
  nombre_cas     INTEGER NOT NULL DEFAULT 0,
  date_detection TIMESTAMP DEFAULT NOW(),
  statut         statut_alerte DEFAULT 'active',
  description    TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alertes_district ON alertes(district_id);
CREATE INDEX IF NOT EXISTS idx_alertes_statut   ON alertes(statut);
