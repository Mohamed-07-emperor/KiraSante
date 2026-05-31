const axios = require('axios');
const logger = require('../../utils/logger');
const { query } = require('../../config/database');

const AT_BASE_URL = 'https://api.africastalking.com/version1';

const envoyerSMS = async (telephone, message) => {
  try {
    // Mode sandbox pour les tests
    const username = process.env.AT_USERNAME || 'sandbox';
    const apiKey   = process.env.AT_API_KEY  || 'sandbox';

    if (username === 'sandbox') {
      // Simulation en mode dev
      logger.info(`📱 [SANDBOX] SMS vers ${telephone}: ${message}`);
      await query(
        `UPDATE rappels_sms SET statut='envoye', envoye_at=NOW()
         WHERE telephone=$1 AND statut='en_attente'
         AND date_envoi_prevu <= NOW()`,
        [telephone]
      );
      return { success: true, sandbox: true };
    }

    const response = await axios.post(
      `${AT_BASE_URL}/messaging`,
      new URLSearchParams({
        username,
        to: telephone,
        message,
        from: process.env.AT_SENDER_ID || 'KiraSante'
      }).toString(),
      {
        headers: {
          'apiKey': apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        },
        timeout: 10000
      }
    );

    logger.success(`SMS envoyé à ${telephone}`);
    return { success: true, data: response.data };
  } catch (err) {
    logger.error(`Erreur envoi SMS à ${telephone}`, err);
    return { success: false, error: err.message };
  }
};

const envoyerAlerteSMS = async (district_id, typeAlerte, nombreCas) => {
  try {
    const agents = await query(
      `SELECT telephone, nom FROM agents
       WHERE district_id=$1 AND actif=true AND telephone IS NOT NULL`,
      [district_id]
    );

    const message = `🚨 KIRA SANTE ALERTE: ${nombreCas} cas de ${typeAlerte} détectés dans votre district. Prenez les mesures nécessaires.`;

    for (const agent of agents.rows) {
      await envoyerSMS(agent.telephone, message);
    }

    logger.info(`Alertes SMS envoyées à ${agents.rows.length} agents`);
    return agents.rows.length;
  } catch (err) {
    logger.error('Erreur envoi alertes SMS', err);
    return 0;
  }
};

const traiterRappelsEnAttente = async () => {
  try {
    const rappels = await query(
      `SELECT r.*, p.nom, p.prenom FROM rappels_sms r
       LEFT JOIN patients p ON r.patient_id = p.id
       WHERE r.statut='en_attente'
       AND r.date_envoi_prevu <= NOW()
       AND r.tentatives < 3
       LIMIT 50`
    );

    logger.info(`📋 ${rappels.rows.length} rappels SMS à traiter`);

    for (const rappel of rappels.rows) {
      const resultat = await envoyerSMS(rappel.telephone, rappel.message);

      if (resultat.success) {
        await query(
          `UPDATE rappels_sms SET statut='envoye', envoye_at=NOW()
           WHERE id=$1`,
          [rappel.id]
        );
      } else {
        await query(
          `UPDATE rappels_sms SET tentatives=tentatives+1,
           statut=CASE WHEN tentatives+1 >= 3 THEN 'echec' ELSE 'en_attente' END
           WHERE id=$1`,
          [rappel.id]
        );
      }
    }
  } catch (err) {
    logger.error('Erreur traitement rappels', err);
  }
};

module.exports = { envoyerSMS, envoyerAlerteSMS, traiterRappelsEnAttente };
