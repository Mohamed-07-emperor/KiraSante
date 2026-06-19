const Patient = require('../models/patient.model');
const { generateUniqueCode, generateQRCode } = require('../utils/qrcode.utils');
const { success, created, notFound, badRequest, error } = require('../utils/response.utils');
const { enregistrerVersion } = require('../services/versioning/versioning.service');
const logger = require('../utils/logger');

const creer = async (req, res) => {
  try {
    const { nom, prenom, date_naissance, sexe, groupe_sanguin,
      allergies, telephone, langue, district_id } = req.body;

    const qr_code = generateUniqueCode();
    const patient = await Patient.create({
      qr_code, nom, prenom, date_naissance, sexe,
      groupe_sanguin, allergies, telephone,
      langue: langue || 'fr',
      district_id: district_id || req.user.district_id,
      agent_id: req.user.id
    });

    const { qrDataURL } = await generateQRCode(patient.id);

    await enregistrerVersion(patient.id, req.user.id, 'CREATION', 'patients', null, patient);

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
    const ancien = await Patient.findById(req.params.id);
    if (!ancien) return notFound(res, 'Patient introuvable');

    const updated = await Patient.update(req.params.id, req.body);

    await enregistrerVersion(req.params.id, req.user.id, 'MODIFICATION', 'patients', ancien, updated);

    return success(res, updated, 'Patient mis à jour');
  } catch (err) {
    logger.error('Erreur modification patient', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const supprimer = async (req, res) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const supprime = await Patient.softDelete(req.params.id);
    if (!supprime) return notFound(res, 'Patient introuvable ou déjà supprimé');

    await enregistrerVersion(req.params.id, req.user.id, 'SUPPRESSION', 'patients', patient, null);

    logger.warn(`Patient supprimé (soft) : ${patient.nom} ${patient.prenom} par agent ${req.user.id}`);
    return success(res, {}, 'Patient supprimé avec succès');
  } catch (err) {
    logger.error('Erreur suppression patient', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { creer, obtenir, parQRCode, lister, modifier, supprimer };
