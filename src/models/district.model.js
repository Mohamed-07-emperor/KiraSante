const { query } = require('../config/database');

const District = {
  findAll: async () => {
    const result = await query('SELECT * FROM districts ORDER BY nom ASC');
    return result.rows;
  },

  findById: async (id) => {
    const result = await query('SELECT * FROM districts WHERE id = $1', [id]);
    return result.rows[0];
  },

  create: async ({ nom, region, population }) => {
    const result = await query(
      'INSERT INTO districts (nom, region, population) VALUES ($1, $2, $3) RETURNING *',
      [nom, region, population]
    );
    return result.rows[0];
  },

  update: async (id, { nom, region, population }) => {
    const result = await query(
      'UPDATE districts SET nom=$1, region=$2, population=$3 WHERE id=$4 RETURNING *',
      [nom, region, population, id]
    );
    return result.rows[0];
  }
};

module.exports = District;
