const { query } = require('../config/database');
const { success, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const rechercherPatients = async (req, res) => {
  try {
    const {
      q,
      district_id,
      langue,
      page = 1,
      limite = 20
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limite);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (q) {
      conditions.push(`(
        LOWER(nom) LIKE $${idx} OR
        LOWER(prenom) LIKE $${idx} OR
        telephone LIKE $${idx} OR
        qr_code LIKE $${idx}
      )`);
      params.push(`%${q.toLowerCase()}%`);
      idx++;
    }

    if (district_id) {
      conditions.push(`district_id = $${idx}`);
      params.push(district_id);
      idx++;
    }

    if (langue) {
      conditions.push(`langue = $${idx}`);
      params.push(langue);
      idx++;
    }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM patients ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT id, qr_code, nom, prenom, date_naissance, sexe,
              groupe_sanguin, telephone, langue, district_id,
              sync_status, created_at
       FROM patients ${where}
       ORDER BY created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, parseInt(limite), offset]
    );

    return success(res, {
      patients: result.rows,
      pagination: {
        total,
        page: parseInt(page),
        limite: parseInt(limite),
        pages: Math.ceil(total / parseInt(limite))
      }
    }, 'Résultats de recherche');
  } catch (err) {
    logger.error('Erreur recherche patients', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const rechercherParTelephone = async (req, res) => {
  try {
    const { telephone } = req.params;
    if (!telephone) return badRequest(res, 'Téléphone requis');

    const result = await query(
      'SELECT * FROM patients WHERE telephone = $1',
      [telephone]
    );

    if (result.rows.length === 0) {
      return success(res, { patients: [], total: 0 }, 'Aucun patient trouvé');
    }

    return success(res, {
      patients: result.rows,
      total: result.rows.length
    }, 'Patient(s) trouvé(s)');
  } catch (err) {
    logger.error('Erreur recherche telephone', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { rechercherPatients, rechercherParTelephone };
