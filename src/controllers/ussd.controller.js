const Patient = require('../models/patient.model');
const Consultation = require('../models/consultation.model');
const { query } = require('../config/database');
const logger = require('../utils/logger');

const webhook = async (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;
    let reponse = '';
    const etapes = text ? text.split('*') : [];
    const etape = etapes.length;

    if (etape === 0 || text === '') {
      reponse = `CON Bienvenue sur KiraSante BF
1. Mon dossier médical
2. Mes médicaments
3. Prochain rendez-vous
4. Alertes sanitaires`;
    }
    else if (etapes[0] === '1') {
      const patient = await Patient.findByTelephone ?
        await query('SELECT * FROM patients WHERE telephone=$1', [phoneNumber]).then(r => r.rows[0])
        : null;

      if (!patient) {
        reponse = `END Aucun dossier trouvé pour ce numéro.
Enregistrez-vous auprès d'un agent de santé.`;
      } else {
        reponse = `END Dossier : ${patient.nom} ${patient.prenom}
Né(e) le : ${patient.date_naissance}
Groupe sanguin : ${patient.groupe_sanguin || 'Non renseigné'}
Allergies : ${patient.allergies || 'Aucune'}`;
      }
    }
    else if (etapes[0] === '4') {
      const alertes = await query(
        "SELECT type_alerte, nombre_cas FROM alertes WHERE statut='active' LIMIT 3"
      );
      if (alertes.rows.length === 0) {
        reponse = 'END Aucune alerte sanitaire active dans votre zone.';
      } else {
        const liste = alertes.rows.map(a => `- ${a.type_alerte} (${a.nombre_cas} cas)`).join('\n');
        reponse = `END Alertes actives :\n${liste}`;
      }
    }
    else {
      reponse = 'END Option invalide. Veuillez réessayer.';
    }

    logger.info(`USSD session ${sessionId} - ${phoneNumber} - étape ${etape}`);
    res.set('Content-Type', 'text/plain');
    return res.send(reponse);
  } catch (err) {
    logger.error('Erreur USSD', err);
    res.set('Content-Type', 'text/plain');
    return res.send('END Erreur du service. Réessayez plus tard.');
  }
};

module.exports = { webhook };
