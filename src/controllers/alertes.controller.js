const Alerte = require('../models/alerte.model');
const { success, created, notFound, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const lister = async (req, res) => {
  try {
    const { statut, district_id } = req.query;
    let alertes;
    if (district_id) {
      alertes = await Alerte.findByDistrict(district_id);
    } else {
      alertes = await Alerte.findAll(statut);
    }
    return success(res, { alertes, total: alertes.length }, 'Liste des alertes');
  } catch (err) {
    logger.error('Erreur liste alertes', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const actives = async (req, res) => {
  try {
    const alertes = await Alerte.findActives();
    return success(res, { alertes, total: alertes.length }, 'Alertes actives');
  } catch (err) {
    logger.error('Erreur alertes actives', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const resoudre = async (req, res) => {
  try {
    const alerte = await Alerte.updateStatut(req.params.id, 'resolue');
    if (!alerte) return notFound(res, 'Alerte introuvable');
    return success(res, alerte, 'Alerte marquée comme résolue');
  } catch (err) {
    logger.error('Erreur résolution alerte', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { lister, actives, resoudre };
