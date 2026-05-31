CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS districts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom        VARCHAR(100) NOT NULL,
  region     VARCHAR(100) NOT NULL,
  population INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
