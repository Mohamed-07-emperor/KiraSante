DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'role_agent') THEN
    CREATE TYPE role_agent AS ENUM ('patient', 'agent', 'admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS agents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom          VARCHAR(100) NOT NULL,
  prenom       VARCHAR(100) NOT NULL,
  email        VARCHAR(150) UNIQUE,
  telephone    VARCHAR(20) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  role         role_agent DEFAULT 'agent',
  district_id  UUID REFERENCES districts(id),
  actif        BOOLEAN DEFAULT true,
  created_at   TIMESTAMP DEFAULT NOW(),
  updated_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_telephone ON agents(telephone);
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);
