const cron = require('node-cron');
const { detecterClusters } = require('./alertes/cluster.service');
const { traiterRappelsEnAttente } = require('./sms/africasTalking.service');
const logger = require('../utils/logger');

const demarrerCrons = () => {
  // Détection clusters toutes les 6 heures
  cron.schedule('0 */6 * * *', async () => {
    logger.info('⏰ Cron : détection clusters');
    await detecterClusters();
  });

  // Traitement rappels SMS toutes les heures
  cron.schedule('0 * * * *', async () => {
    logger.info('⏰ Cron : traitement rappels SMS');
    await traiterRappelsEnAttente();
  });

  // Nettoyage logs anciens tous les lundis à 2h
  cron.schedule('0 2 * * 1', async () => {
    logger.info('⏰ Cron : nettoyage sync_queue ancienne');
    const { query } = require('../config/database');
    await query(
      "DELETE FROM sync_queue WHERE synced_at < NOW() - INTERVAL '30 days'"
    );
  });

  logger.success('✅ Crons démarrés');
};

module.exports = { demarrerCrons };
