const { query } = require('../config/database');
const Patient = require('../models/patient.model');
const { success, created, notFound, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const creer = async (req, res) => {
  try {
    const { patient_id, telephone, message, date_envoi_prevu, type_rappel } = req.body;

    if (!telephone || !message || !date_envoi_prevu || !type_rappel)
      return badRequest(res, 'Téléphone, message, date et type sont requis');

    const types = ['vaccin','rdv','medication','alerte'];
    if (!types.includes(type_rappel))
      return badRequest(res, `Type invalide. Valeurs acceptées : ${types.join(', ')}`);

    if (patient_id) {
      const patient = await Patient.findById(patient_id);
      if (!patient) return notFound(res, 'Patient introuvable');
    }

    const result = await query(
      `INSERT INTO rappels_sms
        (patient_id, telephone, message, date_envoi_prevu, type_rappel)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [patient_id || null, telephone, message, date_envoi_prevu, type_rappel]
    );

    logger.success(`Rappel créé pour ${telephone}`);
    return created(res, result.rows[0], 'Rappel SMS programmé avec succès');
  } catch (err) {
    logger.error('Erreur création rappel', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const lister = async (req, res) => {
  try {
    const { statut, type_rappel, page = 1, limite = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limite);
    const conditions = [];
    const params = [];
    let idx = 1;

    if (statut) { conditions.push(`statut = $${idx++}`); params.push(statut); }
    if (type_rappel) { conditions.push(`type_rappel = $${idx++}`); params.push(type_rappel); }

    const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    const total = await query(`SELECT COUNT(*) FROM rappels_sms ${where}`, params);
    const result = await query(
      `SELECT r.*, p.nom, p.prenom FROM rappels_sms r
       LEFT JOIN patients p ON r.patient_id = p.id
       ${where}
       ORDER BY r.date_envoi_prevu DESC
       LIMIT $${idx} OFFSET $${idx+1}`,
      [...params, parseInt(limite), offset]
    );

    return success(res, {
      rappels: result.rows,
      pagination: {
        total: parseInt(total.rows[0].count),
        page: parseInt(page),
        limite: parseInt(limite),
        pages: Math.ceil(parseInt(total.rows[0].count) / parseInt(limite))
      }
    }, 'Liste des rappels SMS');
  } catch (err) {
    logger.error('Erreur liste rappels', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const annuler = async (req, res) => {
  try {
    const result = await query(
      `UPDATE rappels_sms SET statut='echec'
       WHERE id=$1 AND statut='en_attente'
       RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return notFound(res, 'Rappel introuvable ou déjà traité');
    return success(res, result.rows[0], 'Rappel annulé');
  } catch (err) {
    logger.error('Erreur annulation rappel', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { creer, lister, annuler };
