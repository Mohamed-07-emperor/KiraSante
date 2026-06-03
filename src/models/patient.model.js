const { query } = require('../config/database');

const Patient = {
  findById: async (id) => {
    const result = await query('SELECT * FROM patients WHERE id = $1', [id]);
    return result.rows[0];
  },

  findByQRCode: async (qr_code) => {
    const result = await query('SELECT * FROM patients WHERE qr_code = $1', [qr_code]);
    return result.rows[0];
  },

  findByDistrict: async (district_id, page=1, limite=20) => {
    const offset = (page-1)*limite;
    const result = await query(
      'SELECT * FROM patients WHERE district_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [district_id, limite, offset]
    );
    return result.rows;
  },

  create: async ({ qr_code, nom, prenom, date_naissance, sexe, groupe_sanguin,
    allergies, telephone, langue, district_id, agent_id }) => {
    const result = await query(
      `INSERT INTO patients
        (qr_code, nom, prenom, date_naissance, sexe, groupe_sanguin, allergies, telephone, langue, district_id, agent_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [qr_code, nom, prenom, date_naissance, sexe, groupe_sanguin,
       allergies, telephone, langue || 'fr', district_id, agent_id]
    );
    return result.rows[0];
  },

  update: async (id, fields) => {
    const result = await query(
      `UPDATE patients SET
        nom=$1, prenom=$2, telephone=$3, allergies=$4,
        groupe_sanguin=$5, langue=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [fields.nom, fields.prenom, fields.telephone,
       fields.allergies, fields.groupe_sanguin, fields.langue, id]
    );
    return result.rows[0];
  },

  updateSyncStatus: async (id, status) => {
    await query('UPDATE patients SET sync_status=$1 WHERE id=$2', [status, id]);
  },

  count: async () => {
    const result = await query('SELECT COUNT(*) FROM patients');
    return parseInt(result.rows[0].count);
  }
};

module.exports = Patient;
