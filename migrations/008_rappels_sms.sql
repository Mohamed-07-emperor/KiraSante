DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'statut_sms') THEN
    CREATE TYPE statut_sms AS ENUM ('en_attente', 'envoye', 'echec');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'type_rappel') THEN
    CREATE TYPE type_rappel AS ENUM ('vaccin', 'rdv', 'medication', 'alerte');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS rappels_sms (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id       UUID REFERENCES patients(id),
  telephone        VARCHAR(20) NOT NULL,
  message          TEXT NOT NULL,
  date_envoi_prevu TIMESTAMP NOT NULL,
  statut           statut_sms DEFAULT 'en_attente',
  type_rappel      type_rappel NOT NULL,
  tentatives       INTEGER DEFAULT 0,
  envoye_at        TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rappels_date   ON rappels_sms(date_envoi_prevu);
CREATE INDEX IF NOT EXISTS idx_rappels_statut ON rappels_sms(statut);
