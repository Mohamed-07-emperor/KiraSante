const { query } = require('../config/database');

const Agent = {
  findById: async (id) => {
    const result = await query(
      'SELECT id, nom, prenom, email, telephone, role, district_id, actif, created_at FROM agents WHERE id = $1',
      [id]
    );
    return result.rows[0];
  },

  findByTelephone: async (telephone) => {
    const result = await query(
      'SELECT * FROM agents WHERE telephone = $1',
      [telephone]
    );
    return result.rows[0];
  },

  findByEmail: async (email) => {
    const result = await query(
      'SELECT * FROM agents WHERE email = $1',
      [email]
    );
    return result.rows[0];
  },

  create: async ({ nom, prenom, telephone, mot_de_passe, role, district_id }) => {
    const result = await query(
      `INSERT INTO agents (nom, prenom, telephone, mot_de_passe, role, district_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, nom, prenom, telephone, role, district_id, created_at`,
      [nom, prenom, telephone, mot_de_passe, role || 'agent', district_id]
    );
    return result.rows[0];
  },

  findAll: async (district_id = null) => {
    if (district_id) {
      const result = await query(
        'SELECT id, nom, prenom, email, telephone, role, district_id, actif FROM agents WHERE district_id = $1',
        [district_id]
      );
      return result.rows;
    }
    const result = await query(
      'SELECT id, nom, prenom, email, telephone, role, district_id, actif FROM agents ORDER BY nom ASC'
    );
    return result.rows;
  },

  update: async (id, fields) => {
    const result = await query(
      `UPDATE agents SET nom=$1, prenom=$2, email=$3, telephone=$4, updated_at=NOW()
       WHERE id=$5 RETURNING id, nom, prenom, email, telephone, role`,
      [fields.nom, fields.prenom, fields.email, fields.telephone, id]
    );
    return result.rows[0];
  },

  deactivate: async (id) => {
    const result = await query(
      'UPDATE agents SET actif=false WHERE id=$1 RETURNING id',
      [id]
    );
    return result.rows[0];
  }
};

module.exports = Agent;
