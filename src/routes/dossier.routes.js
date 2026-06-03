const express = require('express');
const router = express.Router();
const { dossierComplet, dossierParQR } = require('../controllers/dossier.controller');
const auth = require('../middlewares/auth.middleware');

router.use(auth);
router.get('/patient/:id',  dossierComplet);
router.get('/qr/:code',     dossierParQR);

module.exports = router;
