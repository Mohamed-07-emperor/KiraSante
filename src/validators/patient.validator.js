const Joi = require('joi');

const patientSchema = Joi.object({
  nom:            Joi.string().min(2).max(100).required().messages({'any.required':'Nom requis','string.min':'Nom trop court'}),
  prenom:         Joi.string().min(2).max(100).required().messages({'any.required':'Prénom requis'}),
  date_naissance: Joi.date().max('now').required().messages({'any.required':'Date de naissance requise','date.max':'Date invalide'}),
  sexe:           Joi.string().valid('M','F').required().messages({'any.required':'Sexe requis','any.only':'Sexe doit être M ou F'}),
  groupe_sanguin: Joi.string().valid('A+','A-','B+','B-','AB+','AB-','O+','O-').optional().allow('',null),
  allergies:      Joi.string().max(500).optional().allow('',null),
  telephone:      Joi.string().pattern(/^\+?[0-9]{8,15}$/).optional().allow('',null),
  langue:         Joi.string().valid('moore','dioula','fulfulde','fr').default('fr'),
  district_id:    Joi.string().uuid().optional().allow('',null)
});

const consultationSchema = Joi.object({
  patient_id: Joi.string().uuid().required().messages({'any.required':'Patient requis'}),
  motif:      Joi.string().min(3).max(500).required().messages({'any.required':'Motif requis'}),
  diagnostic: Joi.string().max(1000).optional().allow('',null),
  traitement: Joi.string().max(1000).optional().allow('',null),
  symptomes:  Joi.array().items(Joi.string()).default([]),
  latitude:   Joi.number().min(-90).max(90).optional().allow(null),
  longitude:  Joi.number().min(-180).max(180).optional().allow(null),
  structure:  Joi.string().max(150).optional().allow('',null)
});

const vaccinationSchema = Joi.object({
  patient_id:      Joi.string().uuid().required().messages({'any.required':'Patient requis'}),
  vaccin_nom:      Joi.string().min(2).max(100).required().messages({'any.required':'Nom du vaccin requis'}),
  date_admin:      Joi.date().required().messages({'any.required':'Date requise'}),
  lot:             Joi.string().max(50).optional().allow('',null),
  prochain_rappel: Joi.date().optional().allow(null),
  structure:       Joi.string().max(150).optional().allow('',null)
});

module.exports = { patientSchema, consultationSchema, vaccinationSchema };
