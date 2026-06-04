const { forbidden } = require('../utils/response.utils');

// Vérification des rôles
const roles = (...rolesAutorises) => (req, res, next) => {
  if (!req.user) return forbidden(res, 'Utilisateur non authentifié');
  if (!rolesAutorises.includes(req.user.role))
    return forbidden(res, `Accès réservé aux : ${rolesAutorises.join(', ')}`);
  next();
};

// Un agent ne peut accéder qu'aux données de son district
const memeDistrict = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.user.role === 'agent' && !req.user.district_id) {
    return forbidden(res, 'Aucun district assigné à votre compte');
  }
  next();
};

// Vérifier que l'agent accède à ses propres données
const proprioOuAdmin = (req, res, next) => {
  if (req.user.role === 'admin') return next();
  if (req.params.id && req.params.id !== req.user.id) {
    return forbidden(res, 'Accès non autorisé à ce profil');
  }
  next();
};

module.exports = roles;
module.exports.memeDistrict = memeDistrict;
module.exports.proprioOuAdmin = proprioOuAdmin;
