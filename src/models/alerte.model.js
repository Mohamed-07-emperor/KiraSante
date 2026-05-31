const { query } = require('../config/database');

const Alerte = {
  findAll: async (statut = null) => {
    if (statut) {
      const result = await query(
        'SELECT * FROM alertes WHERE statut = $1 ORDER BY date_detection DESC',
        [statut]
      );
      return result.rows;
    }
    const result = await query('SELECT * FROM alertes ORDER BY date_detection DESC');
    return result.rows;
  },

  findByDistrict: async (district_id) => {
    const result = await query(
      'SELECT * FROM alertes WHERE district_id = $1 ORDER BY date_detection DESC',
      [district_id]
    );
    return result.rows;
  },

  create: async ({ type_alerte, district_id, latitude, longitude, nombre_cas, description }) => {
    const result = await query(
      `INSERT INTO alertes (type_alerte, district_id, latitude, longitude, nombre_cas, description)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [type_alerte, district_id, latitude, longitude, nombre_cas, description]
    );
    return result.rows[0];
  },

  updateStatut: async (id, statut) => {
    const result = await query(
      'UPDATE alertes SET statut=$1 WHERE id=$2 RETURNING *',
      [statut, id]
    );
    return result.rows[0];
  },

  findActives: async () => {
    const result = await query(
      "SELECT * FROM alertes WHERE statut = 'active' ORDER BY date_detection DESC"
    );
    return result.rows;
  }
};

module.exports = Alerte;
