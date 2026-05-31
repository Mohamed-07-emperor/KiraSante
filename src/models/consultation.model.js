const { query } = require('../config/database');

const Consultation = {
  findById: async (id) => {
    const result = await query('SELECT * FROM consultations WHERE id = $1', [id]);
    return result.rows[0];
  },

  findByPatient: async (patient_id) => {
    const result = await query(
      'SELECT * FROM consultations WHERE patient_id = $1 ORDER BY date_consultation DESC',
      [patient_id]
    );
    return result.rows;
  },

  create: async ({ patient_id, agent_id, motif, diagnostic, traitement,
    symptomes, latitude, longitude, structure }) => {
    const result = await query(
      `INSERT INTO consultations
        (patient_id, agent_id, motif, diagnostic, traitement, symptomes, latitude, longitude, structure)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [patient_id, agent_id, motif, diagnostic, traitement,
       JSON.stringify(symptomes || []), latitude, longitude, structure]
    );
    return result.rows[0];
  },

  findRecentBySymptome: async (symptome, heures = 72, rayon_km = 10) => {
    const result = await query(
      `SELECT c.*, p.district_id
       FROM consultations c
       JOIN patients p ON c.patient_id = p.id
       WHERE c.symptomes @> $1::jsonb
       AND c.date_consultation >= NOW() - INTERVAL '${heures} hours'
       ORDER BY c.date_consultation DESC`,
      [JSON.stringify([symptome])]
    );
    return result.rows;
  },

  countByDistrict: async (district_id, heures = 24) => {
    const result = await query(
      `SELECT COUNT(*) FROM consultations c
       JOIN patients p ON c.patient_id = p.id
       WHERE p.district_id = $1
       AND c.date_consultation >= NOW() - INTERVAL '${heures} hours'`,
      [district_id]
    );
    return parseInt(result.rows[0].count);
  }
};

module.exports = Consultation;
