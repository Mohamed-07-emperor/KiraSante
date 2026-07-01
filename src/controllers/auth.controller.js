const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Agent = require('../models/agent.model');
const { query } = require('../config/database');
const { success, created, badRequest, unauthorized, error } = require('../utils/response.utils');
const logger = require('../utils/logger');
const { enregistrerTentative, verifierBlocage } = require('../services/security/intrusion.service');
const { blacklister } = require('../services/auth/blacklist.service');

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
    logger.success('Nouvel agent : ' + telephone);
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

    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const blocage = await verifierBlocage(ip, telephone);
    if (blocage.bloque) {
      await enregistrerTentative(ip, telephone, false);
      return unauthorized(res, blocage.raison);
    }

    const agent = await Agent.findByTelephone(telephone);
    if (!agent) {
      await enregistrerTentative(ip, telephone, false);
      return unauthorized(res, 'Identifiants incorrects');
    }

    if (!agent.actif) {
      await enregistrerTentative(ip, telephone, false);
      return unauthorized(res, 'Compte désactivé');
    }

    const valide = await bcrypt.compare(mot_de_passe, agent.mot_de_passe);
    if (!valide) {
      await enregistrerTentative(ip, telephone, false);
      return unauthorized(res, 'Identifiants incorrects');
    }

    await enregistrerTentative(ip, telephone, true);
    const { token, refreshToken } = generateTokens(agent);
    const { mot_de_passe: _, ...agentSansMotDePasse } = agent;
    logger.success('Connexion : ' + telephone);
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
    logger.success('Mot de passe changé : ' + agent.telephone);
    return success(res, {}, 'Mot de passe changé avec succès');
  } catch (err) {
    logger.error('Erreur changement mot de passe', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const modifierProfil = async (req, res) => {
  try {
    const { nom, prenom } = req.body;
    if (!nom || !prenom) return badRequest(res, 'Nom et prénom sont requis');
    const result = await query(
      'UPDATE agents SET nom=$1, prenom=$2, updated_at=NOW() WHERE id=$3 RETURNING id, nom, prenom, telephone, role',
      [nom, prenom, req.user.id]
    );
    return success(res, result.rows[0], 'Profil mis à jour');
  } catch (err) {
    logger.error('Erreur modification profil', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const otpStore = new Map();

const demanderResetMotDePasse = async (req, res) => {
  try {
    const { telephone } = req.body;
    if (!telephone) return badRequest(res, 'Numéro de téléphone requis');
    const agent = await Agent.findByTelephone(telephone);
    if (!agent) return success(res, {}, 'Si ce numéro existe, un code vous a été envoyé');
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiration = Date.now() + 10 * 60 * 1000;
    otpStore.set(telephone, { otp, expiration, tentatives: 0, agent_id: agent.id });
    const { envoyerSMS } = require('../services/sms/africasTalking.service');
    await envoyerSMS(telephone, `KiraSante BF - Code : ${otp}. Valable 10 minutes.`);
    logger.success('OTP envoyé à ' + telephone);
    return success(res, {}, 'Code de réinitialisation envoyé par SMS');
  } catch (err) {
    logger.error('Erreur demande reset', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const verifierOTP = async (req, res) => {
  try {
    const { telephone, otp } = req.body;
    if (!telephone || !otp) return badRequest(res, 'Téléphone et code OTP requis');
    const donnees = otpStore.get(telephone);
    if (!donnees) return badRequest(res, 'Aucune demande en cours');
    if (Date.now() > donnees.expiration) { otpStore.delete(telephone); return badRequest(res, 'Code expiré'); }
    if (donnees.tentatives >= 3) { otpStore.delete(telephone); return badRequest(res, 'Trop de tentatives'); }
    if (donnees.otp !== otp) {
      donnees.tentatives++;
      otpStore.set(telephone, donnees);
      return badRequest(res, `Code incorrect. ${3 - donnees.tentatives} tentative(s) restante(s)`);
    }
    const resetToken = jwt.sign({ id: donnees.agent_id, type: 'reset', telephone }, process.env.JWT_SECRET, { expiresIn: '5m' });
    otpStore.delete(telephone);
    logger.success('OTP vérifié pour ' + telephone);
    return success(res, { resetToken }, 'Code vérifié');
  } catch (err) {
    logger.error('Erreur vérification OTP', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const reinitialiserMotDePasse = async (req, res) => {
  try {
    const { resetToken, nouveau_mot_de_passe, confirmer_mot_de_passe } = req.body;
    if (!resetToken || !nouveau_mot_de_passe || !confirmer_mot_de_passe)
      return badRequest(res, 'Token, nouveau mot de passe et confirmation requis');
    if (nouveau_mot_de_passe !== confirmer_mot_de_passe)
      return badRequest(res, 'Les mots de passe ne correspondent pas');
    if (nouveau_mot_de_passe.length < 8)
      return badRequest(res, 'Minimum 8 caractères');
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    if (!regex.test(nouveau_mot_de_passe))
      return badRequest(res, 'Doit contenir majuscule, minuscule et chiffre');
    let decoded;
    try { decoded = jwt.verify(resetToken, process.env.JWT_SECRET); }
    catch (e) { return unauthorized(res, 'Token invalide ou expiré'); }
    if (decoded.type !== 'reset') return unauthorized(res, 'Token invalide');
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 12);
    await query('UPDATE agents SET mot_de_passe=$1, updated_at=NOW() WHERE id=$2', [hash, decoded.id]);
    logger.success('Mot de passe réinitialisé pour ' + decoded.id);
    return success(res, {}, 'Mot de passe réinitialisé. Vous pouvez vous connecter');
  } catch (err) {
    logger.error('Erreur réinitialisation', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const deconnecter = async (req, res) => {
  try {
    const token = req.token;
    const decoded = jwt.decode(token);
    await blacklister(token, req.user.id, decoded.exp);
    logger.success('Déconnexion : ' + req.user.id);
    return success(res, {}, 'Déconnexion réussie');
  } catch (err) {
    logger.error('Erreur déconnexion', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = {
  register, login, refresh, me,
  changerMotDePasse, modifierProfil,
  demanderResetMotDePasse, verifierOTP, reinitialiserMotDePasse,
  deconnecter
};
