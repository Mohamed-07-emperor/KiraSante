const { pool } = require('../config/database');
const logger = require('../utils/logger');

async function migrer() {
  try {
    const check = await pool.query(
      "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='patients'"
    );
    if (parseInt(check.rows[0].count) > 0) {
      logger.info('Base deja initialisee');
      return;
    }
    logger.info('Initialisation base de donnees...');
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE TABLE IF NOT EXISTS districts (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), nom VARCHAR(100) NOT NULL, region VARCHAR(100), population INTEGER, telephone VARCHAR(20), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS agents (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), prenom VARCHAR(100) NOT NULL, nom VARCHAR(100) NOT NULL, telephone VARCHAR(20) UNIQUE, mot_de_passe VARCHAR(255) NOT NULL, role VARCHAR(20) DEFAULT 'agent', district_id UUID REFERENCES districts(id), actif BOOLEAN DEFAULT true, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP);
      CREATE TABLE IF NOT EXISTS patients (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), prenom VARCHAR(100) NOT NULL, nom VARCHAR(100) NOT NULL, date_naissance DATE, sexe CHAR(1), telephone VARCHAR(20) UNIQUE, mot_de_passe VARCHAR(255), groupe_sanguin VARCHAR(5), allergies TEXT, qr_code VARCHAR(100) UNIQUE, langue VARCHAR(20) DEFAULT 'fr', district_id UUID REFERENCES districts(id), agent_id UUID REFERENCES agents(id), sync_status VARCHAR(20) DEFAULT 'pending', created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP);
      CREATE TABLE IF NOT EXISTS consultations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patients(id), agent_id UUID REFERENCES agents(id), motif TEXT NOT NULL, diagnostic TEXT, traitement TEXT, symptomes TEXT[], structure VARCHAR(200), date_consultation TIMESTAMP DEFAULT NOW(), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP);
      CREATE TABLE IF NOT EXISTS vaccinations (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patients(id), agent_id UUID REFERENCES agents(id), vaccin_nom VARCHAR(200) NOT NULL, date_admin DATE NOT NULL, lot VARCHAR(100), prochain_rappel DATE, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), deleted_at TIMESTAMP);
      CREATE TABLE IF NOT EXISTS alertes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), type_alerte VARCHAR(100) NOT NULL, description TEXT, nombre_cas INTEGER DEFAULT 0, district_id UUID REFERENCES districts(id), date_detection TIMESTAMP DEFAULT NOW(), statut VARCHAR(20) DEFAULT 'active', latitude DECIMAL(10,8), longitude DECIMAL(11,8), created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS otp_codes (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), telephone VARCHAR(20) NOT NULL, code VARCHAR(6) NOT NULL, type VARCHAR(20) DEFAULT 'inscription', expire_at TIMESTAMP NOT NULL, utilise BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS token_blacklist (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), token TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS audit_logs (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), agent_id UUID, action VARCHAR(100), table_name VARCHAR(100), record_id UUID, details JSONB, ip_address VARCHAR(50), created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS tentatives_connexion (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), telephone VARCHAR(20), ip_address VARCHAR(50), succes BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS sync_queue (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID, type_operation VARCHAR(50), donnees JSONB, statut VARCHAR(20) DEFAULT 'en_attente', created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS dossier_versions (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patients(id), version INTEGER DEFAULT 1, donnees JSONB, created_at TIMESTAMP DEFAULT NOW());
      CREATE TABLE IF NOT EXISTS rappels_sms (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patients(id), vaccination_id UUID REFERENCES vaccinations(id), vaccin_nom VARCHAR(200), prochain_rappel DATE, statut VARCHAR(20) DEFAULT 'en_attente', created_at TIMESTAMP DEFAULT NOW());
      CREATE INDEX IF NOT EXISTS idx_patients_telephone ON patients(telephone);
      CREATE INDEX IF NOT EXISTS idx_patients_qr ON patients(qr_code);
      CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id);
      CREATE INDEX IF NOT EXISTS idx_vaccinations_patient ON vaccinations(patient_id);
      CREATE INDEX IF NOT EXISTS idx_otp_telephone ON otp_codes(telephone);
    `);
    await pool.query(`INSERT INTO districts (id, nom, region, population) VALUES ('aaf650c0-bea3-42c7-9954-401cfa81b508', 'District de Ouagadougou', 'Centre', 3500000) ON CONFLICT DO NOTHING`);
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('Admin2026!', 12);
    await pool.query(`INSERT INTO agents (prenom, nom, telephone, mot_de_passe, role, district_id, actif) VALUES ('Mohamed', 'SANON', '+22667059399', $1, 'admin', 'aaf650c0-bea3-42c7-9954-401cfa81b508', true) ON CONFLICT (telephone) DO NOTHING`, [hash]);
    const hashAgent = await bcrypt.hash('Test1234!', 12);
    await pool.query(`INSERT INTO agents (prenom, nom, telephone, mot_de_passe, role, district_id, actif) VALUES ('Faissale', 'DRABO', '+22670111222', $1, 'agent', 'aaf650c0-bea3-42c7-9954-401cfa81b508', true) ON CONFLICT (telephone) DO NOTHING`, [hashAgent]);

    // Tables télémédecine
    await pool.query(`
      CREATE TABLE IF NOT EXISTS demandes_consultation (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        patient_id UUID REFERENCES patients(id),
        agent_id UUID,
        statut VARCHAR(20) DEFAULT 'en_attente',
        motif TEXT NOT NULL,
        symptomes TEXT,
        urgence VARCHAR(10) DEFAULT 'normale',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages_consultation (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        demande_id UUID REFERENCES demandes_consultation(id),
        expediteur_type VARCHAR(10) NOT NULL,
        expediteur_id UUID NOT NULL,
        contenu TEXT NOT NULL,
        type_message VARCHAR(20) DEFAULT 'texte',
        lu BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ordonnances (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        demande_id UUID REFERENCES demandes_consultation(id),
        patient_id UUID REFERENCES patients(id),
        agent_id UUID,
        medicaments JSONB,
        instructions TEXT,
        instructions_moore TEXT,
        instructions_dioula TEXT,
        valide_jusqu_au DATE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await pool.query(`CREATE TABLE IF NOT EXISTS grossesses (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      patient_id UUID REFERENCES patients(id),
      date_dernieres_regles DATE NOT NULL,
      date_accouchement_prevue DATE,
      semaine_actuelle INTEGER,
      nombre_cpn INTEGER DEFAULT 0,
      statut VARCHAR(20) DEFAULT 'en_cours',
      agent_id UUID,
      notes TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )`);
    await pool.query(`CREATE TABLE IF NOT EXISTS consultations_cpn (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      grossesse_id UUID REFERENCES grossesses(id),
      patient_id UUID REFERENCES patients(id),
      agent_id UUID,
      numero_cpn INTEGER NOT NULL,
      date_cpn DATE NOT NULL,
      poids DECIMAL(5,2),
      tension_arterielle VARCHAR(20),
      hauteur_uterine DECIMAL(5,2),
      position_foetus VARCHAR(50),
      fcf INTEGER,
      observations TEXT,
      prochaine_cpn DATE,
      created_at TIMESTAMP DEFAULT NOW()
    )`);
    logger.info('Base initialisee avec succes');
  } catch(err) {
    logger.error('Erreur migration:', err.message);
    throw err;
  }
}


async function migrerNouvellesTables() {
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS grossesses (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patients(id), date_dernieres_regles DATE NOT NULL, date_accouchement_prevue DATE, semaine_actuelle INTEGER, nombre_cpn INTEGER DEFAULT 0, statut VARCHAR(20) DEFAULT 'en_cours', agent_id UUID, notes TEXT, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS consultations_cpn (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), grossesse_id UUID REFERENCES grossesses(id), patient_id UUID REFERENCES patients(id), agent_id UUID, numero_cpn INTEGER NOT NULL, date_cpn DATE NOT NULL, poids DECIMAL(5,2), tension_arterielle VARCHAR(20), hauteur_uterine DECIMAL(5,2), position_foetus VARCHAR(50), fcf INTEGER, observations TEXT, prochaine_cpn DATE, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS demandes_consultation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), patient_id UUID REFERENCES patients(id), agent_id UUID, statut VARCHAR(20) DEFAULT 'en_attente', motif TEXT NOT NULL, symptomes TEXT, urgence VARCHAR(10) DEFAULT 'normale', created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages_consultation (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), demande_id UUID REFERENCES demandes_consultation(id), expediteur_type VARCHAR(10) NOT NULL, expediteur_id UUID NOT NULL, contenu TEXT NOT NULL, type_message VARCHAR(20) DEFAULT 'texte', lu BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW())`);
    await pool.query(`CREATE TABLE IF NOT EXISTS ordonnances (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), demande_id UUID REFERENCES demandes_consultation(id), patient_id UUID REFERENCES patients(id), agent_id UUID, medicaments JSONB, instructions TEXT, instructions_moore TEXT, instructions_dioula TEXT, valide_jusqu_au DATE, created_at TIMESTAMP DEFAULT NOW())`);
    logger.info('Nouvelles tables creees avec succes');
  } catch(err) {
    logger.error('Erreur migration nouvelles tables:', err.message);
  }
}

module.exports = { migrer, migrerNouvellesTables };

