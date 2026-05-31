DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'langue_locale') THEN
    CREATE TYPE langue_locale AS ENUM ('moore', 'dioula', 'fulfulde', 'fr');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'sync_status') THEN
    CREATE TYPE sync_status AS ENUM ('synced', 'pending', 'conflict');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS patients (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  qr_code        VARCHAR(64) UNIQUE NOT NULL,
  nom            VARCHAR(100) NOT NULL,
  prenom         VARCHAR(100) NOT NULL,
  date_naissance DATE NOT NULL,
  sexe           CHAR(1) CHECK (sexe IN ('M','F')),
  groupe_sanguin VARCHAR(5),
  allergies      TEXT,
  telephone      VARCHAR(20),
  langue         langue_locale DEFAULT 'fr',
  district_id    UUID REFERENCES districts(id),
  agent_id       UUID REFERENCES agents(id),
  sync_status    sync_status DEFAULT 'pending',
  created_at     TIMESTAMP DEFAULT NOW(),
  updated_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_qr      ON patients(qr_code);
CREATE INDEX IF NOT EXISTS idx_patients_district ON patients(district_id);
