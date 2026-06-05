const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');
const validate = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema, otpSchema, resetSchema } = require('../validators/auth.validator');

router.post('/register',                   rateLimit.auth, validate(registerSchema), ctrl.register);
router.post('/login',                      rateLimit.auth, validate(loginSchema),    ctrl.login);
router.post('/logout',                     auth,                                      ctrl.deconnecter);
router.post('/refresh',                                                               ctrl.refresh);
router.get('/me',                          auth,                                      ctrl.me);
router.put('/changer-mot-de-passe',        auth,                                      ctrl.changerMotDePasse);
router.put('/profil',                      auth,                                      ctrl.modifierProfil);
router.post('/mot-de-passe-oublie',        rateLimit.auth,                            ctrl.demanderResetMotDePasse);
router.post('/verifier-otp',               rateLimit.auth, validate(otpSchema),       ctrl.verifierOTP);
router.post('/reinitialiser-mot-de-passe', validate(resetSchema),                     ctrl.reinitialiserMotDePasse);

module.exports = router;
