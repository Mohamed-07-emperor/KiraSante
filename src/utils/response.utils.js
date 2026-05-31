const success = (res, data={}, message='Succès', status=200) =>
  res.status(status).json({ success:true, message, data, timestamp: new Date().toISOString() });

const created = (res, data={}, message='Créé avec succès') =>
  success(res, data, message, 201);

const error = (res, message='Erreur serveur', status=500, details=null) => {
  const body = { success:false, message, timestamp: new Date().toISOString() };
  if (details && process.env.NODE_ENV==='development') body.details = details;
  return res.status(status).json(body);
};

const notFound    = (res, msg='Ressource introuvable') => error(res, msg, 404);
const unauthorized = (res, msg='Non autorisé')          => error(res, msg, 401);
const forbidden   = (res, msg='Accès refusé')           => error(res, msg, 403);
const badRequest  = (res, msg='Requête invalide', d=null) => error(res, msg, 400, d);

module.exports = { success, created, error, notFound, unauthorized, forbidden, badRequest };
