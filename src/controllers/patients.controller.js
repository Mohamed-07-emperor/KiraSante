const Patient = require('../models/patient.model');
const { generateUniqueCode, generateQRCode } = require('../utils/qrcode.utils');
const { success, created, notFound, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const creer = async (req, res) => {
  try {
    const { nom, prenom, date_naissance, sexe, groupe_sanguin,
      allergies, telephone, langue, district_id } = req.body;

    if (!nom || !prenom || !date_naissance || !sexe)
      return badRequest(res, 'Nom, prénom, date de naissance et sexe sont requis');

    const qr_code = generateUniqueCode();
    const patient = await Patient.create({
      qr_code, nom, prenom, date_naissance, sexe,
      groupe_sanguin, allergies, telephone,
      langue: langue || 'fr',
      district_id: district_id || req.user.district_id,
      agent_id: req.user.id
    });

    const { qrDataURL } = await generateQRCode(patient.id);
    logger.success(`Patient créé : ${nom} ${prenom}`);

    return created(res, { patient, qrDataURL }, 'Patient enregistré avec succès');
  } catch (err) {
    logger.error('Erreur création patient', err);
    return error(res, 'Erreur lors de la création du patient', 500, err.message);
  }
};

const obtenir = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return notFound(res, 'Patient introuvable');
    return success(res, patient, 'Patient récupéré');
  } catch (err) {
    logger.error('Erreur obtenir patient', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const parQRCode = async (req, res) => {
  try {
    const patient = await Patient.findByQRCode(req.params.code);
    if (!patient) return notFound(res, 'Aucun patient trouvé pour ce QR code');
    return success(res, patient, 'Patient trouvé');
  } catch (err) {
    logger.error('Erreur QR code', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const lister = async (req, res) => {
  try {
    const district_id = req.query.district || req.user.district_id;
    const patients = await Patient.findByDistrict(district_id);
    return success(res, { patients, total: patients.length }, 'Liste des patients');
  } catch (err) {
    logger.error('Erreur liste patients', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const modifier = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const updated = await Patient.update(req.params.id, req.body);
    return success(res, updated, 'Patient mis à jour');
  } catch (err) {
    logger.error('Erreur modification patient', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { creer, obtenir, parQRCode, lister, modifier };
