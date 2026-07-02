const { query } = require('../config/database');
const { JWT_SECRET } = require('../config/jwt.config');
const { success, badRequest, notFound, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

// Patient cree une demande de consultation
const creerDemande = async (req, res) => {
  try {
    const { motif, symptomes, urgence = 'normale' } = req.body;
    const patient_id = req.user.id;
    if (!motif) return badRequest(res, 'Motif requis');
    const r = await query(
      `INSERT INTO demandes_consultation (patient_id, motif, symptomes, urgence)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [patient_id, motif, symptomes, urgence]
    );
    logger.success(`Demande consultation creee: ${r.rows[0].id}`);
    return success(res, { demande: r.rows[0] }, 'Demande envoyee avec succes');
  } catch(err) {
    logger.error('Erreur creerDemande', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Patient voit ses demandes
const mesDemandesPatient = async (req, res) => {
  try {
    const patient_id = req.user.id;
    const r = await query(
      `SELECT d.*, 
        a.prenom as agent_prenom, a.nom as agent_nom,
        (SELECT COUNT(*) FROM messages_consultation WHERE demande_id=d.id) as nb_messages,
        (SELECT COUNT(*) FROM messages_consultation WHERE demande_id=d.id AND lu=false AND expediteur_type='agent') as messages_non_lus
       FROM demandes_consultation d
       LEFT JOIN agents a ON d.agent_id = a.id
       WHERE d.patient_id = $1
       ORDER BY d.created_at DESC`,
      [patient_id]
    );
    return success(res, { demandes: r.rows, total: r.rows.length });
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Agent voit toutes les demandes en attente
const demandesEnAttente = async (req, res) => {
  try {
    const r = await query(
      `SELECT d.*,
        p.prenom as patient_prenom, p.nom as patient_nom,
        p.telephone as patient_telephone, p.date_naissance,
        p.groupe_sanguin, p.allergies,
        (SELECT COUNT(*) FROM messages_consultation WHERE demande_id=d.id) as nb_messages
       FROM demandes_consultation d
       JOIN patients p ON d.patient_id = p.id
       WHERE d.statut IN ('en_attente', 'en_cours')
       ORDER BY d.urgence DESC, d.created_at ASC`
    );
    return success(res, { demandes: r.rows, total: r.rows.length });
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Agent prend en charge une demande
const prendreEnCharge = async (req, res) => {
  try {
    const { id } = req.params;
    const agent_id = req.user.id;
    const r = await query(
      `UPDATE demandes_consultation SET agent_id=$1, statut='en_cours', updated_at=NOW()
       WHERE id=$2 AND statut='en_attente' RETURNING *`,
      [agent_id, id]
    );
    if (!r.rows.length) return badRequest(res, 'Demande introuvable ou deja prise en charge');
    return success(res, { demande: r.rows[0] }, 'Demande prise en charge');
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Envoyer un message
const envoyerMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { contenu, type_message = 'texte' } = req.body;
    const expediteur_type = req.user.role === 'patient' ? 'patient' : 'agent';
    const expediteur_id = req.user.id;
    if (!contenu) return badRequest(res, 'Message vide');
    const r = await query(
      `INSERT INTO messages_consultation (demande_id, expediteur_type, expediteur_id, contenu, type_message)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [id, expediteur_type, expediteur_id, contenu, type_message]
    );
    // Marquer les messages de l'autre partie comme lus
    await query(
      `UPDATE messages_consultation SET lu=true
       WHERE demande_id=$1 AND expediteur_type!=$2`,
      [id, expediteur_type]
    );
    return success(res, { message: r.rows[0] }, 'Message envoye');
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Voir les messages d'une demande
const voirMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const r = await query(
      `SELECT * FROM messages_consultation WHERE demande_id=$1 ORDER BY created_at ASC`,
      [id]
    );
    return success(res, { messages: r.rows, total: r.rows.length });
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Agent cree une ordonnance
const creerOrdonnance = async (req, res) => {
  try {
    const { id } = req.params;
    const { medicaments, instructions, instructions_moore, instructions_dioula, valide_jusqu_au } = req.body;
    const agent_id = req.user.id;
    const demande = await query('SELECT * FROM demandes_consultation WHERE id=$1', [id]);
    if (!demande.rows.length) return notFound(res, 'Demande introuvable');
    const patient_id = demande.rows[0].patient_id;
    const r = await query(
      `INSERT INTO ordonnances (demande_id, patient_id, agent_id, medicaments, instructions, instructions_moore, instructions_dioula, valide_jusqu_au)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [id, patient_id, agent_id, JSON.stringify(medicaments), instructions, instructions_moore, instructions_dioula, valide_jusqu_au]
    );
    // Marquer la demande comme terminee
    await query(
      `UPDATE demandes_consultation SET statut='terminee', updated_at=NOW() WHERE id=$1`,
      [id]
    );
    // Ajouter message automatique
    await query(
      `INSERT INTO messages_consultation (demande_id, expediteur_type, expediteur_id, contenu, type_message)
       VALUES ($1, 'agent', $2, 'Ordonnance disponible - Consultez votre espace patient pour la telecharger', 'ordonnance')`,
      [id, agent_id]
    );
    return success(res, { ordonnance: r.rows[0] }, 'Ordonnance creee');
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Patient voit ses ordonnances
const mesOrdonnances = async (req, res) => {
  try {
    const patient_id = req.user.id;
    const r = await query(
      `SELECT o.*, a.prenom as agent_prenom, a.nom as agent_nom
       FROM ordonnances o
       LEFT JOIN agents a ON o.agent_id = a.id
       WHERE o.patient_id = $1
       ORDER BY o.created_at DESC`,
      [patient_id]
    );
    return success(res, { ordonnances: r.rows, total: r.rows.length });
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Cloturer une demande
const cloturerDemande = async (req, res) => {
  try {
    const { id } = req.params;
    await query(
      `UPDATE demandes_consultation SET statut='terminee', updated_at=NOW() WHERE id=$1`,
      [id]
    );
    return success(res, {}, 'Consultation cloturee');
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = {
  creerDemande, mesDemandesPatient, demandesEnAttente,
  prendreEnCharge, envoyerMessage, voirMessages,
  creerOrdonnance, mesOrdonnances, cloturerDemande
};
