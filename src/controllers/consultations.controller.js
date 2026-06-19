const Consultation = require('../models/consultation.model');
const Patient = require('../models/patient.model');
const { success, created, notFound, badRequest, error } = require('../utils/response.utils');
const { enregistrerVersion } = require('../services/versioning/versioning.service');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const creer = async (req, res) => {
  try {
    const { patient_id, motif, diagnostic, traitement,
      symptomes, latitude, longitude, structure } = req.body;

    const patient = await Patient.findById(patient_id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const consultation = await Consultation.create({
      patient_id, agent_id: req.user.id,
      motif, diagnostic, traitement,
      symptomes, latitude, longitude, structure
    });

    await enregistrerVersion(patient_id, req.user.id, 'CREATION', 'consultations', null, consultation);

    logger.success(`Consultation créée pour patient : ${patient_id}`);
    return created(res, consultation, 'Consultation enregistrée');
  } catch (err) {
    logger.error('Erreur création consultation', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const parPatient = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.patient_id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const { page = 1, limite = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limite);

    const totalResult = await query(
      'SELECT COUNT(*) FROM consultations WHERE patient_id=$1 AND deleted_at IS NULL',
      [req.params.patient_id]
    );
    const total = parseInt(totalResult.rows[0].count);

    const result = await query(
      `SELECT * FROM consultations WHERE patient_id=$1 AND deleted_at IS NULL
       ORDER BY date_consultation DESC LIMIT $2 OFFSET $3`,
      [req.params.patient_id, parseInt(limite), offset]
    );

    return success(res, {
      consultations: result.rows,
      pagination: {
        total, page: parseInt(page), limite: parseInt(limite),
        pages: Math.ceil(total / parseInt(limite))
      }
    }, 'Historique des consultations');
  } catch (err) {
    logger.error('Erreur liste consultations', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const supprimer = async (req, res) => {
  try {
    const result = await query(
      'UPDATE consultations SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id, patient_id',
      [req.params.id]
    );
    if (!result.rows[0]) return notFound(res, 'Consultation introuvable ou déjà supprimée');

    await enregistrerVersion(result.rows[0].patient_id, req.user.id, 'SUPPRESSION', 'consultations', result.rows[0], null);

    logger.warn(`Consultation supprimée : ${req.params.id} par agent ${req.user.id}`);
    return success(res, {}, 'Consultation supprimée avec succès');
  } catch (err) {
    logger.error('Erreur suppression consultation', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { creer, parPatient, supprimer };
