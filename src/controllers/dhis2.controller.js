const { query } = require('../config/database');
const { success, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const exporter = async (req, res) => {
  try {
    const { district_id, date_debut, date_fin } = req.query;

    const conditions = ['1=1'];
    const params = [];
    let idx = 1;

    if (district_id) {
      conditions.push(`p.district_id = $${idx++}`);
      params.push(district_id);
    }
    if (date_debut) {
      conditions.push(`c.date_consultation >= $${idx++}`);
      params.push(date_debut);
    }
    if (date_fin) {
      conditions.push(`c.date_consultation <= $${idx++}`);
      params.push(date_fin);
    }

    const where = conditions.join(' AND ');

    const consultations = await query(`
      SELECT
        d.nom as district,
        COUNT(DISTINCT p.id) as total_patients,
        COUNT(c.id) as total_consultations,
        COUNT(v.id) as total_vaccinations
      FROM districts d
      LEFT JOIN patients p ON p.district_id = d.id
      LEFT JOIN consultations c ON c.patient_id = p.id
      LEFT JOIN vaccinations v ON v.patient_id = p.id
      GROUP BY d.id, d.nom
      ORDER BY d.nom
    `, []);

    const alertes = await query(`
      SELECT type_alerte, COUNT(*) as total, MAX(date_detection) as derniere_detection
      FROM alertes
      GROUP BY type_alerte
      ORDER BY total DESC
    `, []);

    const dhis2Format = {
      metadata: {
        exportDate: new Date().toISOString(),
        version: '1.0',
        source: 'KiraSante BF',
        periode: { debut: date_debut || 'tout', fin: date_fin || 'tout' }
      },
      dataValues: consultations.rows.map(row => ({
        orgUnit: row.district,
        dataElement: 'KIRA_PATIENTS',
        value: row.total_patients,
        consultations: row.total_consultations,
        vaccinations: row.total_vaccinations
      })),
      alertes: alertes.rows,
      totalPatients: consultations.rows.reduce((s, r) => s + parseInt(r.total_patients), 0),
      totalConsultations: consultations.rows.reduce((s, r) => s + parseInt(r.total_consultations), 0)
    };

    logger.success('Export DHIS2 généré');
    return success(res, dhis2Format, 'Export DHIS2 généré');
  } catch (err) {
    logger.error('Erreur export DHIS2', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { exporter };
