const { query } = require('../config/database');
const Patient = require('../models/patient.model');
const { success, notFound, error } = require('../utils/response.utils');
const logger = require('../utils/logger');
const { generateQRCode } = require('../utils/qrcode.utils');

const dossierComplet = async (req, res) => {
  try {
    const { id } = req.params;

    const patient = await Patient.findById(id);
    if (!patient) return notFound(res, 'Patient introuvable');
    try {
      if (patient.qr_code) {
        patient.qrDataURL = await generateQRCode(patient.qr_code);
      }
    } catch(qrErr) { logger.warn('QR generation warning:', qrErr.message); }
    try {
      if (patient.qr_code) {
        patient.qrDataURL = await generateQRCode(patient.qr_code);
      }
    } catch(qrErr) { logger.warn('QR generation warning:', qrErr.message); }

    // Récupérer tout en parallèle
    const [consultations, vaccinations, rappels, alertes_district] = await Promise.all([
      query(
        `SELECT c.*, a.nom as agent_nom, a.prenom as agent_prenom
         FROM consultations c
         LEFT JOIN agents a ON c.agent_id = a.id
         WHERE c.patient_id = $1
         ORDER BY c.date_consultation DESC`,
        [id]
      ),
      query(
        `SELECT v.*, a.nom as agent_nom, a.prenom as agent_prenom
         FROM vaccinations v
         LEFT JOIN agents a ON v.agent_id = a.id
         WHERE v.patient_id = $1
         ORDER BY v.date_admin DESC`,
        [id]
      ),
      query(
        `SELECT * FROM rappels_sms
         WHERE patient_id = $1
         ORDER BY date_envoi_prevu DESC`,
        [id]
      ),
      query(
        `SELECT * FROM alertes
         WHERE district_id = $1
         AND statut = 'active'
         ORDER BY date_detection DESC
         LIMIT 5`,
        [patient.district_id]
      ),
    ]);

    // Prochain vaccin
    const prochain_vaccin = await query(
      `SELECT vaccin_nom, prochain_rappel
       FROM vaccinations
       WHERE patient_id = $1
       AND prochain_rappel >= CURRENT_DATE
       ORDER BY prochain_rappel ASC
       LIMIT 1`,
      [id]
    );

    // Dernière consultation
    const derniere_consultation = consultations.rows[0] || null;

    return success(res, {
      patient,
      resume: {
        total_consultations: consultations.rows.length,
        total_vaccinations: vaccinations.rows.length,
        derniere_consultation: derniere_consultation?.date_consultation || null,
        prochain_vaccin: prochain_vaccin.rows[0] || null,
        alertes_actives_district: alertes_district.rows.length
      },
      consultations: consultations.rows,
      vaccinations: vaccinations.rows,
      rappels: rappels.rows,
      alertes_district: alertes_district.rows
    }, 'Dossier médical complet');
  } catch (err) {
    logger.error('Erreur dossier complet', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const dossierParQR = async (req, res) => {
  try {
    const { code } = req.params;
    const result = await query('SELECT * FROM patients WHERE qr_code = $1', [code]);
    if (!result.rows[0]) return notFound(res, 'Patient introuvable');
    req.params.id = result.rows[0].id;
    return dossierComplet(req, res);
  } catch (err) {
    logger.error('Erreur dossier QR', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { dossierComplet, dossierParQR };
