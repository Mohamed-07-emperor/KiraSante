const axios = require('axios');
const logger = require('../../utils/logger');
const { query } = require('../../config/database');

const envoyerNotification = async (agent_id, titre, corps, donnees = {}) => {
  try {
    const FCM_KEY = process.env.FCM_SERVER_KEY;
    if (!FCM_KEY || FCM_KEY === 'ta_cle_firebase') {
      logger.info(`[FCM SANDBOX] Notification a ${agent_id}: ${titre} - ${corps}`);
      return { success: true, sandbox: true };
    }
    const agent = await query('SELECT fcm_token FROM agents WHERE id = $1', [agent_id]);
    if (!agent.rows[0]?.fcm_token) {
      logger.warn(`Pas de token FCM pour agent ${agent_id}`);
      return { success: false, message: 'Token FCM manquant' };
    }
    const response = await axios.post(
      'https://fcm.googleapis.com/fcm/send',
      {
        to: agent.rows[0].fcm_token,
        notification: { title: titre, body: corps, sound: 'default' },
        data: donnees,
        priority: 'high'
      },
      { headers: { 'Authorization': `key=${FCM_KEY}`, 'Content-Type': 'application/json' }, timeout: 10000 }
    );
    logger.success(`Notification FCM envoyee a agent ${agent_id}`);
    return { success: true, data: response.data };
  } catch (err) {
    logger.error('Erreur notification FCM', err);
    return { success: false, error: err.message };
  }
};

const notifierAlerte = async (district_id, typeAlerte, nombreCas) => {
  try {
    const agents = await query('SELECT id FROM agents WHERE district_id=$1 AND actif=true', [district_id]);
    for (const agent of agents.rows) {
      await envoyerNotification(agent.id, 'Alerte Sanitaire KiraSante',
        `${nombreCas} cas de ${typeAlerte} detectes dans votre district`,
        { type: 'alerte', typeAlerte, nombreCas: String(nombreCas) });
    }
    return agents.rows.length;
  } catch (err) {
    logger.error('Erreur notification alerte FCM', err);
    return 0;
  }
};

const enregistrerTokenFCM = async (agent_id, fcm_token) => {
  try {
    await query('UPDATE agents SET fcm_token=$1 WHERE id=$2', [fcm_token, agent_id]);
    logger.success(`Token FCM enregistre pour agent ${agent_id}`);
    return true;
  } catch (err) {
    logger.error('Erreur enregistrement token FCM', err);
    return false;
  }
};

module.exports = { envoyerNotification, notifierAlerte, enregistrerTokenFCM };
