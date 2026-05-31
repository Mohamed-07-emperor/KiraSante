const logger = require('../utils/logger');

const errorMiddleware = (err, req, res, next) => {
  logger.error(`${req.method} ${req.url}`, err);

  if (err.code === '23505')
    return res.status(409).json({ success:false, message:'Cette entrée existe déjà' });
  if (err.code === '23503')
    return res.status(400).json({ success:false, message:'Référence invalide' });

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur interne du serveur',
    ...(process.env.NODE_ENV==='development' && { stack: err.stack })
  });
};

module.exports = errorMiddleware;
