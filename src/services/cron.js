const cron = require('node-cron');
const { detecterClusters } = require('./alertes/cluster.service');
const { traiterRappelsEnAttente } = require('./sms/africasTalking.service');
const { nettoyerExpires } = require('./auth/blacklist.service');
const { creerBackup, nettoyerVieuxBackups } = require('./backup/backup.service');
const cache = require('./cache/cache.service');
const logger = require('../utils/logger');

const demarrerCrons = () => {
  cron.schedule('0 * * * *', async () => {
    logger.info('Cron : rappels SMS');
    await traiterRappelsEnAttente();
  });

  cron.schedule('0 */6 * * *', async () => {
    logger.info('Cron : detection clusters');
    await detecterClusters();
  });

  cron.schedule('0 3 * * *', async () => {
    logger.info('Cron : nettoyage blacklist JWT');
    await nettoyerExpires();
  });

  cron.schedule('0 2 * * *', async () => {
    logger.info('Cron : backup base de donnees');
    await creerBackup();
    await nettoyerVieuxBackups(7);
  });

  cron.schedule('0 4 * * 1', async () => {
    logger.info('Cron : nettoyage sync_queue');
    const { query } = require('../config/database');
    await query("DELETE FROM sync_queue WHERE synced_at < NOW() - INTERVAL '30 days'");
  });

  cron.schedule('*/10 * * * *', () => {
    cache.nettoyer();
  });

  logger.success('Crons demarres');
};

module.exports = { demarrerCrons };
