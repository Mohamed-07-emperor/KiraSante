const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/recherche.controller');
const auth = require('../middlewares/auth.middleware');

router.use(auth);
router.get('/patients',              ctrl.rechercherPatients);
router.get('/patients/tel/:telephone', ctrl.rechercherParTelephone);

module.exports = router;
