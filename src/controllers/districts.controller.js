const District = require('../models/district.model');
const { success, created, notFound, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const lister = async (req, res) => {
  try {
    const districts = await District.findAll();
    return success(res, { districts, total: districts.length }, 'Liste des districts');
  } catch (err) {
    logger.error('Erreur liste districts', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const obtenir = async (req, res) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) return notFound(res, 'District introuvable');
    return success(res, district, 'District récupéré');
  } catch (err) {
    logger.error('Erreur obtenir district', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const creer = async (req, res) => {
  try {
    const { nom, region, population } = req.body;
    if (!nom || !region) return badRequest(res, 'Nom et région sont requis');
    const district = await District.create({ nom, region, population });
    logger.success(`District créé : ${nom}`);
    return created(res, district, 'District créé avec succès');
  } catch (err) {
    logger.error('Erreur création district', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const modifier = async (req, res) => {
  try {
    const district = await District.findById(req.params.id);
    if (!district) return notFound(res, 'District introuvable');
    const updated = await District.update(req.params.id, req.body);
    return success(res, updated, 'District mis à jour');
  } catch (err) {
    logger.error('Erreur modification district', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { lister, obtenir, creer, modifier };
