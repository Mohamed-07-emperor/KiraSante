const { query } = require('../../config/database');
const logger = require('../../utils/logger');

const enregistrerVersion = async (patient_id, agent_id, action, table_cible, ancien_etat, nouvel_etat) => {
  try {
    await query(
      'INSERT INTO dossier_versions (patient_id, agent_id, action, table_cible, ancien_etat, nouvel_etat) VALUES ($1,$2,$3,$4,$5,$6)',
      [patient_id, agent_id, action, table_cible, ancien_etat ? JSON.stringify(ancien_etat) : null, nouvel_etat ? JSON.stringify(nouvel_etat) : null]
    );
  } catch (err) {
    logger.error('Erreur versioning', err);
  }
};

const obtenirHistorique = async (patient_id, limite = 50) => {
  const result = await query(
    `SELECT v.*, a.nom as agent_nom, a.prenom as agent_prenom
     FROM dossier_versions v
     LEFT JOIN agents a ON v.agent_id = a.id
     WHERE v.patient_id = $1
     ORDER BY v.created_at DESC LIMIT $2`,
    [patient_id, limite]
  );
  return result.rows;
};

module.exports = { enregistrerVersion, obtenirHistorique };
