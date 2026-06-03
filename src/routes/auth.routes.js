const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/auth.controller');
const auth = require('../middlewares/auth.middleware');
const rateLimit = require('../middlewares/rateLimit.middleware');

router.post('/register',                   rateLimit.auth, ctrl.register);
router.post('/login',                      rateLimit.auth, ctrl.login);
router.post('/refresh',                    ctrl.refresh);
router.get('/me',                          auth, ctrl.me);
router.put('/changer-mot-de-passe',        auth, ctrl.changerMotDePasse);
router.put('/profil',                      auth, ctrl.modifierProfil);
router.post('/mot-de-passe-oublie',        rateLimit.auth, ctrl.demanderResetMotDePasse);
router.post('/verifier-otp',               rateLimit.auth, ctrl.verifierOTP);
router.post('/reinitialiser-mot-de-passe', ctrl.reinitialiserMotDePasse);

module.exports = router;
