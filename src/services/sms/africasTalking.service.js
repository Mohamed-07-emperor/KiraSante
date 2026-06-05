const axios = require('axios');
const logger = require('../../utils/logger');
const { query } = require('../../config/database');

const AT_BASE_URL = 'https://api.africastalking.com/version1';
const MAX_RETRY = 3;
const RETRY_DELAY = 5000;

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const envoyerSMSAvecRetry = async (telephone, message, tentative = 1) => {
  try {
    const username = process.env.AT_USERNAME || 'sandbox';
    const apiKey   = process.env.AT_API_KEY  || 'sandbox';

    if (username === 'sandbox') {
      logger.info(`[SANDBOX] SMS vers ${telephone}: ${message}`);
      return { success: true, sandbox: true };
    }

    const response = await axios.post(
      `${AT_BASE_URL}/messaging`,
      new URLSearchParams({
        username,
        to:      telephone,
        message,
        from:    process.env.AT_SENDER_ID || 'KiraSante'
      }).toString(),
      {
        headers: {
          'apiKey':       apiKey,
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept':       'application/json'
        },
        timeout: 10000
      }
    );

    logger.success(`SMS envoyé à ${telephone}`);
    return { success: true, data: response.data };

  } catch (err) {
    logger.warn(`SMS échoué tentative ${tentative}/${MAX_RETRY} vers ${telephone} : ${err.message}`);

    if (tentative < MAX_RETRY) {
      await sleep(RETRY_DELAY * tentative);
      return envoyerSMSAvecRetry(telephone, message, tentative + 1);
    }

    logger.error(`SMS définitivement échoué vers ${telephone}`, err);
    return { success: false, error: err.message };
  }
};

const envoyerSMS = envoyerSMSAvecRetry;

const envoyerAlerteSMS = async (district_id, typeAlerte, nombreCas) => {
  try {
    const agents = await query(
      'SELECT telephone, nom FROM agents WHERE district_id=$1 AND actif=true AND telephone IS NOT NULL',
      [district_id]
    );

    const message = `KIRA SANTE ALERTE: ${nombreCas} cas de ${typeAlerte} detectes dans votre district. Prenez les mesures necessaires.`;
    let envoyes = 0;

    for (const agent of agents.rows) {
      const result = await envoyerSMS(agent.telephone, message);
      if (result.success) envoyes++;
    }

    logger.info(`Alertes SMS : ${envoyes}/${agents.rows.length} envoyees`);
    return envoyes;
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
       AND r.tentatives < $1
       LIMIT 50`,
      [MAX_RETRY]
    );

    logger.info(`${rappels.rows.length} rappels SMS a traiter`);

    for (const rappel of rappels.rows) {
      const resultat = await envoyerSMS(rappel.telephone, rappel.message);

      if (resultat.success) {
        await query(
          'UPDATE rappels_sms SET statut=$1, envoye_at=NOW() WHERE id=$2',
          ['envoye', rappel.id]
        );
      } else {
        const nouveauStatut = rappel.tentatives + 1 >= MAX_RETRY ? 'echec' : 'en_attente';
        await query(
          'UPDATE rappels_sms SET tentatives=tentatives+1, statut=$1 WHERE id=$2',
          [nouveauStatut, rappel.id]
        );
      }
    }
  } catch (err) {
    logger.error('Erreur traitement rappels', err);
  }
};

module.exports = { envoyerSMS, envoyerAlerteSMS, traiterRappelsEnAttente };
