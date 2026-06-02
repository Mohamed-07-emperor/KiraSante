const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

router.use(auth);

router.get('/stats',        ctrl.statistiquesGlobales);
router.get('/districts',    roles('admin'), ctrl.statistiquesParDistrict);
router.get('/evolution',    roles('admin'), ctrl.evolutionConsultations);
router.get('/symptomes',    roles('admin'), ctrl.topSymptomes);
router.get('/rappels',      ctrl.rappelsVaccinaux);

module.exports = router;
