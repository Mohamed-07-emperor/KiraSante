const Joi = require('joi');

const registerSchema = Joi.object({
  nom:          Joi.string().min(2).max(100).required().messages({'any.required':'Nom requis'}),
  prenom:       Joi.string().min(2).max(100).required().messages({'any.required':'Prénom requis'}),
  email:        Joi.string().email().optional().allow('',null),
  telephone:    Joi.string().pattern(/^\+?[0-9]{8,15}$/).required().messages({'any.required':'Téléphone requis','string.pattern.base':'Format invalide'}),
  mot_de_passe: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'any.required':'Mot de passe requis',
    'string.min':'Minimum 8 caractères',
    'string.pattern.base':'Doit contenir majuscule, minuscule et chiffre'
  }),
  role:        Joi.string().valid('patient','agent','admin').default('agent'),
  district_id: Joi.string().uuid().optional().allow('',null)
});

const loginSchema = Joi.object({
  telephone:    Joi.string().required().messages({'any.required':'Téléphone requis'}),
  mot_de_passe: Joi.string().required().messages({'any.required':'Mot de passe requis'})
});

const otpSchema = Joi.object({
  telephone: Joi.string().required(),
  otp:       Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
    'string.length':'Code OTP doit contenir 6 chiffres',
    'string.pattern.base':'Code OTP doit être numérique'
  })
});

const resetSchema = Joi.object({
  resetToken:             Joi.string().required(),
  nouveau_mot_de_passe:   Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required().messages({
    'string.pattern.base':'Doit contenir majuscule, minuscule et chiffre'
  }),
  confirmer_mot_de_passe: Joi.string().valid(Joi.ref('nouveau_mot_de_passe')).required().messages({
    'any.only':'Les mots de passe ne correspondent pas'
  })
});

const rappelSchema = Joi.object({
  patient_id:       Joi.string().uuid().optional().allow('',null),
  telephone:        Joi.string().pattern(/^\+?[0-9]{8,15}$/).required(),
  message:          Joi.string().min(5).max(160).required(),
  date_envoi_prevu: Joi.date().required(),
  type_rappel:      Joi.string().valid('vaccin','rdv','medication','alerte').required()
});

module.exports = { registerSchema, loginSchema, otpSchema, resetSchema, rappelSchema };
