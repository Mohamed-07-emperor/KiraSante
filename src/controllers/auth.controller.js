const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Agent = require('../models/agent.model');
const { query } = require('../config/database');
const { success, created, badRequest, unauthorized, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const generateTokens = (agent) => {
  const payload = { id: agent.id, role: agent.role, district_id: agent.district_id };
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
  const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' });
  return { token, refreshToken };
};

const register = async (req, res) => {
  try {
    const { nom, prenom, email, telephone, mot_de_passe, role, district_id } = req.body;
    if (!nom || !prenom || !telephone || !mot_de_passe)
      return badRequest(res, 'Nom, prénom, téléphone et mot de passe sont requis');
    const existant = await Agent.findByTelephone(telephone);
    if (existant) return badRequest(res, 'Ce numéro de téléphone est déjà utilisé');
    const hash = await bcrypt.hash(mot_de_passe, 12);
    const agent = await Agent.create({ nom, prenom, email, telephone, mot_de_passe: hash, role, district_id });
    const { token, refreshToken } = generateTokens(agent);
    logger.success(`Nouvel agent enregistré : ${telephone}`);
    return created(res, { agent, token, refreshToken }, 'Compte créé avec succès');
  } catch (err) {
    logger.error('Erreur register', err);
    return error(res, 'Erreur lors de la création du compte', 500, err.message);
  }
};

const login = async (req, res) => {
  try {
    const { telephone, mot_de_passe } = req.body;
    if (!telephone || !mot_de_passe)
      return badRequest(res, 'Téléphone et mot de passe requis');
    const agent = await Agent.findByTelephone(telephone);
    if (!agent) return unauthorized(res, 'Identifiants incorrects');
    if (!agent.actif) return unauthorized(res, 'Compte désactivé');
    const valide = await bcrypt.compare(mot_de_passe, agent.mot_de_passe);
    if (!valide) return unauthorized(res, 'Identifiants incorrects');
    const { token, refreshToken } = generateTokens(agent);
    const { mot_de_passe: _, ...agentSansMotDePasse } = agent;
    logger.success(`Connexion : ${telephone}`);
    return success(res, { agent: agentSansMotDePasse, token, refreshToken }, 'Connexion réussie');
  } catch (err) {
    logger.error('Erreur login', err);
    return error(res, 'Erreur lors de la connexion', 500, err.message);
  }
};

const refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return badRequest(res, 'Refresh token manquant');
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const agent = await Agent.findById(decoded.id);
    if (!agent) return unauthorized(res, 'Agent introuvable');
    const tokens = generateTokens(agent);
    return success(res, tokens, 'Token renouvelé');
  } catch (err) {
    return unauthorized(res, 'Refresh token invalide ou expiré');
  }
};

const me = async (req, res) => {
  try {
    const agent = await Agent.findById(req.user.id);
    if (!agent) return unauthorized(res, 'Agent introuvable');
    return success(res, agent, 'Profil récupéré');
  } catch (err) {
    logger.error('Erreur me', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const changerMotDePasse = async (req, res) => {
  try {
    const { ancien_mot_de_passe, nouveau_mot_de_passe } = req.body;
    if (!ancien_mot_de_passe || !nouveau_mot_de_passe)
      return badRequest(res, 'Ancien et nouveau mot de passe requis');
    if (nouveau_mot_de_passe.length < 8)
      return badRequest(res, 'Le nouveau mot de passe doit contenir au moins 8 caractères');
    const result = await query('SELECT * FROM agents WHERE id=$1', [req.user.id]);
    const agent = result.rows[0];
    if (!agent) return unauthorized(res, 'Agent introuvable');
    const valide = await bcrypt.compare(ancien_mot_de_passe, agent.mot_de_passe);
    if (!valide) return unauthorized(res, 'Ancien mot de passe incorrect');
    const meme = await bcrypt.compare(nouveau_mot_de_passe, agent.mot_de_passe);
    if (meme) return badRequest(res, 'Le nouveau mot de passe doit être différent');
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 12);
    await query('UPDATE agents SET mot_de_passe=$1, updated_at=NOW() WHERE id=$2', [hash, req.user.id]);
    logger.success(`Mot de passe changé : ${agent.telephone}`);
    return success(res, {}, 'Mot de passe changé avec succès');
  } catch (err) {
    logger.error('Erreur changement mot de passe', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const modifierProfil = async (req, res) => {
  try {
    const { nom, prenom, email } = req.body;
    if (!nom || !prenom) return badRequest(res, 'Nom et prénom sont requis');
    const result = await query(
      'UPDATE agents SET nom=$1, prenom=$2, email=$3, updated_at=NOW() WHERE id=$4 RETURNING id, nom, prenom, email, telephone, role',
      [nom, prenom, email, req.user.id]
    );
    return success(res, result.rows[0], 'Profil mis à jour');
  } catch (err) {
    logger.error('Erreur modification profil', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};


module.exports = { register, login, refresh, me, changerMotDePasse, modifierProfil };

// Stockage temporaire des OTP (en production utiliser Redis)
const otpStore = new Map();

const demanderResetMotDePasse = async (req, res) => {
  try {
    const { telephone } = req.body;
    if (!telephone) return badRequest(res, 'Numéro de téléphone requis');

    const agent = await Agent.findByTelephone(telephone);
    // Réponse identique même si agent inexistant (sécurité)
    if (!agent) {
      return success(res, {}, 'Si ce numéro existe, un code vous a été envoyé');
    }

    // Générer OTP 6 chiffres
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Stocker OTP avec expiration
    otpStore.set(telephone, {
      otp,
      expiration,
      tentatives: 0,
      agent_id: agent.id
    });

    // Envoyer SMS
    const { envoyerSMS } = require('../services/sms/africasTalking.service');
    await envoyerSMS(
      telephone,
      `KiraSante BF - Votre code de reinitialisation : ${otp}. Valable 10 minutes. Ne le partagez pas.`
    );

    logger.success(`OTP envoyé à ${telephone}`);
    return success(res, {}, 'Code de réinitialisation envoyé par SMS');
  } catch (err) {
    logger.error('Erreur demande reset mot de passe', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const verifierOTP = async (req, res) => {
  try {
    const { telephone, otp } = req.body;
    if (!telephone || !otp) return badRequest(res, 'Téléphone et code OTP requis');

    const donnees = otpStore.get(telephone);

    if (!donnees) {
      return badRequest(res, 'Aucune demande de réinitialisation en cours');
    }

    // Vérifier expiration
    if (Date.now() > donnees.expiration) {
      otpStore.delete(telephone);
      return badRequest(res, 'Code expiré. Veuillez refaire une demande');
    }

    // Vérifier tentatives (max 3)
    if (donnees.tentatives >= 3) {
      otpStore.delete(telephone);
      return badRequest(res, 'Trop de tentatives. Veuillez refaire une demande');
    }

    // Vérifier OTP
    if (donnees.otp !== otp) {
      donnees.tentatives++;
      otpStore.set(telephone, donnees);
      const restantes = 3 - donnees.tentatives;
      return badRequest(res, `Code incorrect. ${restantes} tentative(s) restante(s)`);
    }

    // OTP valide — générer token temporaire de reset
    const jwt = require('jsonwebtoken');
    const resetToken = jwt.sign(
      { id: donnees.agent_id, type: 'reset', telephone },
      process.env.JWT_SECRET,
      { expiresIn: '5m' }
    );

    // Marquer OTP comme vérifié
    otpStore.delete(telephone);

    logger.success(`OTP vérifié pour ${telephone}`);
    return success(res, { resetToken }, 'Code vérifié. Vous pouvez maintenant changer votre mot de passe');
  } catch (err) {
    logger.error('Erreur vérification OTP', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const reinitialiserMotDePasse = async (req, res) => {
  try {
    const { resetToken, nouveau_mot_de_passe, confirmer_mot_de_passe } = req.body;

    if (!resetToken || !nouveau_mot_de_passe || !confirmer_mot_de_passe) {
      return badRequest(res, 'Token, nouveau mot de passe et confirmation requis');
    }

    if (nouveau_mot_de_passe !== confirmer_mot_de_passe) {
      return badRequest(res, 'Les mots de passe ne correspondent pas');
    }

    if (nouveau_mot_de_passe.length < 8) {
      return badRequest(res, 'Le mot de passe doit contenir au moins 8 caractères');
    }

    // Vérifier force du mot de passe
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(nouveau_mot_de_passe)) {
      return badRequest(res, 'Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre');
    }

    // Vérifier reset token
    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch (e) {
      return unauthorized(res, 'Token invalide ou expiré. Veuillez refaire une demande');
    }

    if (decoded.type !== 'reset') {
      return unauthorized(res, 'Token invalide');
    }

    // Hasher et sauvegarder
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 12);
    await query(
      'UPDATE agents SET mot_de_passe=$1, updated_at=NOW() WHERE id=$2',
      [hash, decoded.id]
    );

    logger.success(`Mot de passe réinitialisé pour agent ${decoded.id}`);
    return success(res, {}, 'Mot de passe réinitialisé avec succès. Vous pouvez maintenant vous connecter');
  } catch (err) {
    logger.error('Erreur réinitialisation mot de passe', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { register, login, refresh, me, changerMotDePasse, modifierProfil, demanderResetMotDePasse, verifierOTP, reinitialiserMotDePasse };
