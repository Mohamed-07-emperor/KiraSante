const jwt = require('jsonwebtoken');
const { unauthorized } = require('../utils/response.utils');

const authMiddleware = (req, res, next) => {
  try {
    const header = req.headers['authorization'];
    if (!header || !header.startsWith('Bearer '))
      return unauthorized(res, 'Token manquant ou mal formé');

    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return unauthorized(res, 'Token expiré — veuillez vous reconnecter');
    if (err.name === 'JsonWebTokenError')
      return unauthorized(res, 'Token invalide');
    return unauthorized(res, 'Authentification échouée');
  }
};

module.exports = authMiddleware;
