const { query } = require('../config/database');
const { success, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const rechercherPatients = async (req, res) => {
  try {
    const { q, district_id, langue, page = 1, limite = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limite);
    const conditions = ['p.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (q) {
      conditions.push(`(
        to_tsvector('french', COALESCE(p.nom,'') || ' ' || COALESCE(p.prenom,'')) @@ plainto_tsquery('french', $${idx})
        OR p.telephone LIKE $${idx+1}
        OR p.qr_code LIKE $${idx+1}
      )`);
      params.push(q, `%${q}%`);
      idx += 2;
    }

    if (district_id) { conditions.push(`p.district_id = $${idx++}`); params.push(district_id); }
    if (langue)      { conditions.push(`p.langue = $${idx++}`);      params.push(langue); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(`SELECT COUNT(*) FROM patients p ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT p.id, p.qr_code, p.nom, p.prenom, p.date_naissance, p.sexe,
              p.groupe_sanguin, p.telephone, p.langue, p.district_id, p.created_at
       FROM patients p ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx} OFFSET $${idx+1}`,
      [...params, parseInt(limite), offset]
    );

    return success(res, {
      patients: result.rows,
      pagination: {
        total, page: parseInt(page), limite: parseInt(limite),
        pages: Math.ceil(total / parseInt(limite)),
        suivant:   parseInt(page) < Math.ceil(total / parseInt(limite)) ? parseInt(page) + 1 : null,
        precedent: parseInt(page) > 1 ? parseInt(page) - 1 : null
      }
    }, 'Résultats de recherche');
  } catch (err) {
    logger.error('Erreur recherche patients', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const rechercherConsultations = async (req, res) => {
  try {
    const { q, patient_id, page = 1, limite = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limite);
    const conditions = ['c.deleted_at IS NULL'];
    const params = [];
    let idx = 1;

    if (q) {
      conditions.push(
        `to_tsvector('french', COALESCE(c.motif,'') || ' ' || COALESCE(c.diagnostic,'') || ' ' || COALESCE(c.traitement,'')) @@ plainto_tsquery('french', $${idx++})`
      );
      params.push(q);
    }

    if (patient_id) { conditions.push(`c.patient_id = $${idx++}`); params.push(patient_id); }

    const where = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(`SELECT COUNT(*) FROM consultations c ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT c.*, p.nom, p.prenom FROM consultations c
       JOIN patients p ON c.patient_id = p.id
       ${where}
       ORDER BY c.date_consultation DESC
       LIMIT $${idx} OFFSET $${idx+1}`,
      [...params, parseInt(limite), offset]
    );

    return success(res, {
      consultations: result.rows,
      pagination: { total, page: parseInt(page), limite: parseInt(limite), pages: Math.ceil(total / parseInt(limite)) }
    }, 'Résultats de recherche consultations');
  } catch (err) {
    logger.error('Erreur recherche consultations', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const rechercherParTelephone = async (req, res) => {
  try {
    const { telephone } = req.params;
    if (!telephone) return badRequest(res, 'Téléphone requis');
    const result = await query(
      'SELECT * FROM patients WHERE telephone=$1 AND deleted_at IS NULL',
      [telephone]
    );
    return success(res, { patients: result.rows, total: result.rows.length }, 'Résultat');
  } catch (err) {
    logger.error('Erreur recherche telephone', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { rechercherPatients, rechercherConsultations, rechercherParTelephone };
