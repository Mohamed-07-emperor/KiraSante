const express = require('express');
const router = express.Router();
const { envoyerOTP, verifierInscription, loginPatient, reinitialiserMotDePasse } = require('../controllers/otp.controller');
const rateLimit = require('express-rate-limit');

const otpLimit = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Trop de tentatives. Reessayez dans 10 minutes.' }
});

router.post('/envoyer',              otpLimit, envoyerOTP);
router.post('/verifier-inscription', otpLimit, verifierInscription);
router.post('/login-patient',        otpLimit, loginPatient);
router.post('/reinitialiser',        otpLimit, reinitialiserMotDePasse);

module.exports = router;
