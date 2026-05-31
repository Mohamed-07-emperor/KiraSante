const Vaccination = require('../models/vaccination.model');
const Patient = require('../models/patient.model');
const { success, created, notFound, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const creer = async (req, res) => {
  try {
    const { patient_id, vaccin_nom, date_admin, lot, prochain_rappel, structure } = req.body;

    if (!patient_id || !vaccin_nom || !date_admin)
      return badRequest(res, 'Patient, nom du vaccin et date sont requis');

    const patient = await Patient.findById(patient_id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const vaccination = await Vaccination.create({
      patient_id, agent_id: req.user.id,
      vaccin_nom, date_admin, lot, prochain_rappel, structure
    });

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

    const vaccinations = await Vaccination.findByPatient(req.params.patient_id);
    return success(res, { vaccinations, total: vaccinations.length }, 'Carnet vaccinal');
  } catch (err) {
    logger.error('Erreur liste vaccinations', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { creer, parPatient };
