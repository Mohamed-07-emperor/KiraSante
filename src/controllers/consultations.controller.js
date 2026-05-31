const Consultation = require('../models/consultation.model');
const Patient = require('../models/patient.model');
const { success, created, notFound, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const creer = async (req, res) => {
  try {
    const { patient_id, motif, diagnostic, traitement,
      symptomes, latitude, longitude, structure } = req.body;

    if (!patient_id || !motif)
      return badRequest(res, 'Patient et motif sont requis');

    const patient = await Patient.findById(patient_id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const consultation = await Consultation.create({
      patient_id, agent_id: req.user.id,
      motif, diagnostic, traitement,
      symptomes, latitude, longitude, structure
    });

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

    const consultations = await Consultation.findByPatient(req.params.patient_id);
    return success(res, { consultations, total: consultations.length }, 'Historique des consultations');
  } catch (err) {
    logger.error('Erreur liste consultations', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { creer, parPatient };
