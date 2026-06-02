const svc = require('../services/traduction/traduction.service');
const { success, badRequest, notFound, error } = require('../utils/response.utils');
const traduireMot = (req, res) => {
  try {
    const { terme, langue } = req.query;
    if (!terme) return badRequest(res, 'Parametre terme requis');
    const r = svc.traduire(terme, langue || 'moore');
    if (!r.succes) return notFound(res, r.message);
    return success(res, r, 'Traduction reussie');
  } catch(e){ return error(res,'Erreur',500,e.message); }
};
const rechercher = (req, res) => {
  try {
    const { terme, langue } = req.query;
    if (!terme) return badRequest(res, 'Parametre terme requis');
    const r = svc.rechercherFloue(terme, langue || 'moore');
    return success(res, { resultats: r, total: r.length }, 'Recherche terminee');
  } catch(e){ return error(res,'Erreur',500,e.message); }
};
const traduireTexte = (req, res) => {
  try {
    const { texte, langue } = req.body;
    if (!texte) return badRequest(res, 'Champ texte requis');
    const r = svc.traduireOrdonnance(texte, langue || 'moore');
    return success(res, r, 'Ordonnance traduite');
  } catch(e){ return error(res,'Erreur',500,e.message); }
};
const lister = (req, res) => {
  try {
    const t = svc.listerTermes();
    return success(res, { termes: t, total: t.length }, 'Dictionnaire');
  } catch(e){ return error(res,'Erreur',500,e.message); }
};
module.exports = { traduireMot, rechercher, traduireTexte, lister };
