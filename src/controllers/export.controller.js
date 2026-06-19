const { genererCarnetSante } = require('../services/export/pdf.service');
const { exporterPatients, importerPatients } = require('../services/export/csv.service');
const { query } = require('../config/database');
const Patient = require('../models/patient.model');
const { generateUniqueCode } = require('../utils/qrcode.utils');
const { success, notFound, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const exporterPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const [consultations, vaccinations] = await Promise.all([
      query('SELECT * FROM consultations WHERE patient_id=$1 ORDER BY date_consultation DESC', [id]),
      query('SELECT * FROM vaccinations WHERE patient_id=$1 ORDER BY date_admin DESC', [id])
    ]);

    const prochain_vaccin = await query(
      'SELECT vaccin_nom, prochain_rappel FROM vaccinations WHERE patient_id=$1 AND prochain_rappel >= CURRENT_DATE ORDER BY prochain_rappel ASC LIMIT 1',
      [id]
    );

    const dossier = {
      patient,
      resume: {
        total_consultations: consultations.rows.length,
        total_vaccinations:  vaccinations.rows.length,
        derniere_consultation: consultations.rows[0]?.date_consultation || null,
        prochain_vaccin:     prochain_vaccin.rows[0] || null
      },
      consultations: consultations.rows,
      vaccinations:  vaccinations.rows
    };

    genererCarnetSante(dossier, res);
  } catch (err) {
    logger.error('Erreur export PDF', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const exporterCSV = async (req, res) => {
  try {
    const { district_id } = req.query;
    const conditions = district_id ? 'WHERE district_id=$1 AND deleted_at IS NULL' : 'WHERE deleted_at IS NULL';
    const params = district_id ? [district_id] : [];
    const result = await query(`SELECT * FROM patients ${conditions} ORDER BY created_at DESC`, params);
    exporterPatients(result.rows, res);
  } catch (err) {
    logger.error('Erreur export CSV', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const importerCSV = async (req, res) => {
  try {
    if (!req.file) return badRequest(res, 'Fichier CSV requis');
    const contenu = req.file.buffer.toString('utf-8');
    const { patients, erreurs } = await importerPatients(contenu);

    if (patients.length === 0) {
      return badRequest(res, 'Aucun patient valide dans le fichier', erreurs);
    }

    const importes = [];
    for (const p of patients) {
      try {
        const qr_code = generateUniqueCode();
        const result = await query(
          `INSERT INTO patients (qr_code, nom, prenom, date_naissance, sexe, groupe_sanguin, telephone, langue, agent_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, qr_code, nom, prenom`,
          [qr_code, p.nom, p.prenom, p.date_naissance, p.sexe, p.groupe_sanguin, p.telephone, p.langue, req.user.id]
        );
        importes.push(result.rows[0]);
      } catch (e) {
        erreurs.push({ patient: `${p.nom} ${p.prenom}`, erreur: e.message });
      }
    }

    logger.success(`Import CSV : ${importes.length} patients importés`);
    return success(res, {
      importes: importes.length,
      erreurs: erreurs.length,
      details_erreurs: erreurs
    }, `${importes.length} patients importés avec succès`);
  } catch (err) {
    logger.error('Erreur import CSV', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { exporterPDF, exporterCSV, importerCSV };
