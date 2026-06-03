const { query } = require('../config/database');
const logger = require('../utils/logger');

const audit = (action, table_cible = null) => {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = async (data) => {
      if (res.statusCode < 400 && req.user) {
        try {
          await query(
            `INSERT INTO audit_logs (agent_id, action, table_cible, details, ip_address)
             VALUES ($1,$2,$3,$4,$5)`,
            [
              req.user.id,
              action,
              table_cible,
              JSON.stringify({ method: req.method, url: req.url, body: req.body }),
              req.ip || req.connection?.remoteAddress
            ]
          );
        } catch (err) {
          logger.error('Erreur audit log', err);
        }
      }
      return originalJson(data);
    };
    next();
  };
};

module.exports = audit;
