const { forbidden } = require('../utils/response.utils');

const roles = (...rolesAutorises) => (req, res, next) => {
  if (!req.user) return forbidden(res, 'Utilisateur non authentifié');
  if (!rolesAutorises.includes(req.user.role))
    return forbidden(res, `Accès réservé aux : ${rolesAutorises.join(', ')}`);
  next();
};

module.exports = roles;
