const { query } = require('../../config/database');
const Alerte = require('../../models/alerte.model');
const logger = require('../../utils/logger');

// Symptômes surveillés
const SYMPTOMES_SURVEILLES = [
  'fievre', 'paludisme', 'cholera', 'rougeole',
  'meningite', 'diarrhee', 'vomissement', 'toux'
];

const detecterClusters = async () => {
  logger.info('🔍 Analyse des clusters épidémiques...');

  const rayonKm   = parseFloat(process.env.CLUSTER_RADIUS_KM) || 10;
  const minCas    = parseInt(process.env.CLUSTER_MIN_CASES)   || 5;
  const heures    = parseInt(process.env.CLUSTER_TIME_HOURS)  || 72;

  for (const symptome of SYMPTOMES_SURVEILLES) {
    try {
      // Récupérer les consultations récentes avec ce symptôme
      const result = await query(
        `SELECT c.id, c.latitude, c.longitude, c.date_consultation,
                p.district_id, d.nom as district_nom
         FROM consultations c
         JOIN patients p ON c.patient_id = p.id
         JOIN districts d ON p.district_id = d.id
         WHERE c.symptomes @> $1::jsonb
         AND c.date_consultation >= NOW() - INTERVAL '${heures} hours'
         AND c.latitude IS NOT NULL
         AND c.longitude IS NOT NULL`,
        [JSON.stringify([symptome])]
      );

      const consultations = result.rows;
      if (consultations.length < minCas) continue;

      // Grouper par district
      const parDistrict = {};
      for (const c of consultations) {
        if (!c.district_id) continue;
        if (!parDistrict[c.district_id]) {
          parDistrict[c.district_id] = {
            district_id: c.district_id,
            district_nom: c.district_nom,
            cas: [],
            latitudes: [],
            longitudes: []
          };
        }
        parDistrict[c.district_id].cas.push(c);
        parDistrict[c.district_id].latitudes.push(parseFloat(c.latitude));
        parDistrict[c.district_id].longitudes.push(parseFloat(c.longitude));
      }

      // Vérifier si seuil atteint par district
      for (const [district_id, data] of Object.entries(parDistrict)) {
        if (data.cas.length >= minCas) {
          // Vérifier si alerte déjà active pour ce symptôme/district
          const existante = await query(
            `SELECT id FROM alertes
             WHERE district_id=$1
             AND type_alerte=$2
             AND statut='active'
             AND date_detection >= NOW() - INTERVAL '${heures} hours'`,
            [district_id, symptome]
          );

          if (existante.rows.length > 0) {
            logger.info(`Alerte déjà active : ${symptome} - ${data.district_nom}`);
            continue;
          }

          // Calculer le centre géographique
          const latMoy = data.latitudes.reduce((a,b) => a+b, 0) / data.latitudes.length;
          const lonMoy = data.longitudes.reduce((a,b) => a+b, 0) / data.longitudes.length;

          // Créer l'alerte
          const alerte = await Alerte.create({
            type_alerte: symptome,
            district_id,
            latitude: latMoy,
            longitude: lonMoy,
            nombre_cas: data.cas.length,
            description: `Cluster détecté : ${data.cas.length} cas de ${symptome} en ${heures}h dans le district de ${data.district_nom}`
          });

          logger.warn(`🚨 ALERTE : ${data.cas.length} cas de ${symptome} dans ${data.district_nom}`);

          // Notifier les agents du district
          await notifierAgentsDistrict(district_id, alerte);
        }
      }
    } catch (err) {
      logger.error(`Erreur analyse symptôme ${symptome}`, err);
    }
  }

  logger.info('✅ Analyse clusters terminée');
};

const notifierAgentsDistrict = async (district_id, alerte) => {
  try {
    const agents = await query(
      `SELECT telephone, nom, prenom FROM agents
       WHERE district_id=$1 AND actif=true AND telephone IS NOT NULL`,
      [district_id]
    );

    logger.info(`📱 Notification de ${agents.rows.length} agents pour alerte ${alerte.type_alerte}`);

    // Les SMS seront envoyés via le service SMS
    return agents.rows;
  } catch (err) {
    logger.error('Erreur notification agents', err);
  }
};

module.exports = { detecterClusters, notifierAgentsDistrict };
