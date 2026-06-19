const Vaccination = require('../models/vaccination.model');
const Patient = require('../models/patient.model');
const { success, created, notFound, badRequest, error } = require('../utils/response.utils');
const { enregistrerVersion } = require('../services/versioning/versioning.service');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const creer = async (req, res) => {
  try {
    const { patient_id, vaccin_nom, date_admin, lot, prochain_rappel, structure } = req.body;

    const patient = await Patient.findById(patient_id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const vaccination = await Vaccination.create({
      patient_id, agent_id: req.user.id,
      vaccin_nom, date_admin, lot, prochain_rappel, structure
    });

    await enregistrerVersion(patient_id, req.user.id, 'CREATION', 'vaccinations', null, vaccination);

    logger.success(`Vaccination enregistrée : ${vaccin_nom} pour ${patient_id}`);
    return created(res, vaccination, 'Vaccination enregistrée');
  } catch (err) {
    logger.error('Erreur vaccination', err);
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
      'SELECT COUNT(*) FROM vaccinations WHERE patient_id=$1 AND deleted_at IS NULL',
      [req.params.patient_id]
    );
    const total = parseInt(totalResult.rows[0].count);

    const result = await query(
      `SELECT * FROM vaccinations WHERE patient_id=$1 AND deleted_at IS NULL
       ORDER BY date_admin DESC LIMIT $2 OFFSET $3`,
      [req.params.patient_id, parseInt(limite), offset]
    );

    return success(res, {
      vaccinations: result.rows,
      pagination: {
        total, page: parseInt(page), limite: parseInt(limite),
        pages: Math.ceil(total / parseInt(limite))
      }
    }, 'Carnet vaccinal');
  } catch (err) {
    logger.error('Erreur liste vaccinations', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const supprimer = async (req, res) => {
  try {
    const result = await query(
      'UPDATE vaccinations SET deleted_at=NOW() WHERE id=$1 AND deleted_at IS NULL RETURNING id, patient_id',
      [req.params.id]
    );
    if (!result.rows[0]) return notFound(res, 'Vaccination introuvable ou déjà supprimée');

    await enregistrerVersion(result.rows[0].patient_id, req.user.id, 'SUPPRESSION', 'vaccinations', result.rows[0], null);

    logger.warn(`Vaccination supprimée : ${req.params.id} par agent ${req.user.id}`);
    return success(res, {}, 'Vaccination supprimée avec succès');
  } catch (err) {
    logger.error('Erreur suppression vaccination', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { creer, parPatient, supprimer };
