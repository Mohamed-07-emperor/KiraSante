const rateLimit = require('express-rate-limit');

const general = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { success: false, message: 'Trop de requêtes, réessayez dans 15 minutes.' }
});

const auth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Trop de tentatives. Réessayez dans 15 minutes.' }
});

const sync = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, message: 'Trop de synchronisations. Réessayez dans 1 minute.' }
});

module.exports = { general, auth, sync };
