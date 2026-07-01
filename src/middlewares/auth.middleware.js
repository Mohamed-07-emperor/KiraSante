const { JWT_SECRET } = require('../config/jwt.config');
const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response.utils');
const { estBlackliste } = require('../services/auth/blacklist.service');
const logger = require('../utils/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer '))
      return unauthorized(res, 'Token manquant ou mal formé');

    const token = header.split(' ')[1];

    // Vérifier blacklist
    const blackliste = await estBlackliste(token);
    if (blackliste) return unauthorized(res, 'Session expirée — veuillez vous reconnecter');

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    req.token = token;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return unauthorized(res, 'Token expiré — veuillez vous reconnecter');
    if (err.name === 'JsonWebTokenError')
      return unauthorized(res, 'Token invalide');
    logger.error('Auth middleware erreur', err);
    return unauthorized(res, 'Authentification échouée');
  }
};

module.exports = authMiddleware;
