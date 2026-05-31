const { query } = require('../config/database');

const Vaccination = {
  findByPatient: async (patient_id) => {
    const result = await query(
      'SELECT * FROM vaccinations WHERE patient_id = $1 ORDER BY date_admin DESC',
      [patient_id]
    );
    return result.rows;
  },

  create: async ({ patient_id, agent_id, vaccin_nom, date_admin, lot, prochain_rappel, structure }) => {
    const result = await query(
      `INSERT INTO vaccinations
        (patient_id, agent_id, vaccin_nom, date_admin, lot, prochain_rappel, structure)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [patient_id, agent_id, vaccin_nom, date_admin, lot, prochain_rappel, structure]
    );
    return result.rows[0];
  },

  findRappelsDuJour: async () => {
    const result = await query(
      `SELECT v.*, p.telephone, p.nom, p.prenom
       FROM vaccinations v
       JOIN patients p ON v.patient_id = p.id
       WHERE v.prochain_rappel = CURRENT_DATE + INTERVAL '3 days'
       AND p.telephone IS NOT NULL`
    );
    return result.rows;
  },

  findById: async (id) => {
    const result = await query('SELECT * FROM vaccinations WHERE id = $1', [id]);
    return result.rows[0];
  }
};

module.exports = Vaccination;
