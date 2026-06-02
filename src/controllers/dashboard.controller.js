const { query } = require('../config/database');
const { success, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const statistiquesGlobales = async (req, res) => {
  try {
    const [patients, consultations, vaccinations, alertes, agents] = await Promise.all([
      query('SELECT COUNT(*) FROM patients'),
      query('SELECT COUNT(*) FROM consultations'),
      query('SELECT COUNT(*) FROM vaccinations'),
      query("SELECT COUNT(*) FROM alertes WHERE statut='active'"),
      query("SELECT COUNT(*) FROM agents WHERE actif=true"),
    ]);

    const aujourd_hui = await query(
      "SELECT COUNT(*) FROM consultations WHERE date_consultation >= CURRENT_DATE"
    );

    const cette_semaine = await query(
      "SELECT COUNT(*) FROM patients WHERE created_at >= NOW() - INTERVAL '7 days'"
    );

    return success(res, {
      patients:         parseInt(patients.rows[0].count),
      consultations:    parseInt(consultations.rows[0].count),
      vaccinations:     parseInt(vaccinations.rows[0].count),
      alertes_actives:  parseInt(alertes.rows[0].count),
      agents_actifs:    parseInt(agents.rows[0].count),
      consultations_aujourd_hui: parseInt(aujourd_hui.rows[0].count),
      nouveaux_patients_semaine: parseInt(cette_semaine.rows[0].count),
    }, 'Statistiques globales');
  } catch (err) {
    logger.error('Erreur dashboard global', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const statistiquesParDistrict = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        d.id, d.nom, d.region,
        COUNT(DISTINCT p.id) as total_patients,
        COUNT(DISTINCT c.id) as total_consultations,
        COUNT(DISTINCT a.id) as alertes_actives
      FROM districts d
      LEFT JOIN patients p ON p.district_id = d.id
      LEFT JOIN consultations c ON c.patient_id = p.id
      LEFT JOIN alertes a ON a.district_id = d.id AND a.statut = 'active'
      GROUP BY d.id, d.nom, d.region
      ORDER BY total_patients DESC
    `);

    return success(res, {
      districts: result.rows,
      total: result.rows.length
    }, 'Statistiques par district');
  } catch (err) {
    logger.error('Erreur dashboard districts', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const evolutionConsultations = async (req, res) => {
  try {
    const jours = parseInt(req.query.jours) || 30;

    const result = await query(`
      SELECT
        DATE(date_consultation) as jour,
        COUNT(*) as total
      FROM consultations
      WHERE date_consultation >= NOW() - INTERVAL '${jours} days'
      GROUP BY DATE(date_consultation)
      ORDER BY jour ASC
    `);

    return success(res, {
      evolution: result.rows,
      periode: jours + ' jours'
    }, 'Evolution des consultations');
  } catch (err) {
    logger.error('Erreur evolution consultations', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const topSymptomes = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        jsonb_array_elements_text(symptomes) as symptome,
        COUNT(*) as occurrences
      FROM consultations
      WHERE date_consultation >= NOW() - INTERVAL '30 days'
      AND symptomes != '[]'
      GROUP BY symptome
      ORDER BY occurrences DESC
      LIMIT 10
    `);

    return success(res, {
      symptomes: result.rows,
      periode: '30 derniers jours'
    }, 'Top symptômes');
  } catch (err) {
    logger.error('Erreur top symptomes', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const rappelsVaccinaux = async (req, res) => {
  try {
    const result = await query(`
      SELECT
        v.vaccin_nom,
        v.prochain_rappel,
        p.nom, p.prenom, p.telephone,
        p.district_id,
        d.nom as district_nom
      FROM vaccinations v
      JOIN patients p ON v.patient_id = p.id
      LEFT JOIN districts d ON p.district_id = d.id
      WHERE v.prochain_rappel BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '7 days'
      ORDER BY v.prochain_rappel ASC
    `);

    return success(res, {
      rappels: result.rows,
      total: result.rows.length
    }, 'Rappels vaccinaux prochains 7 jours');
  } catch (err) {
    logger.error('Erreur rappels vaccinaux', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = {
  statistiquesGlobales,
  statistiquesParDistrict,
  evolutionConsultations,
  topSymptomes,
  rappelsVaccinaux
};
