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

module.exports = { register, login, refresh, me, changerMotDePasse };
