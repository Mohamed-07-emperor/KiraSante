const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/dashboard.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const { cacheMiddleware } = require('../middlewares/cache.middleware');

router.use(auth);
router.get('/stats',     cacheMiddleware(300, 'dashboard'), ctrl.statistiquesGlobales);
router.get('/districts', roles('admin'), cacheMiddleware(300, 'dashboard'), ctrl.statistiquesParDistrict);
router.get('/evolution', roles('admin'), cacheMiddleware(600, 'dashboard'), ctrl.evolutionConsultations);
router.get('/symptomes', roles('admin'), cacheMiddleware(600, 'dashboard'), ctrl.topSymptomes);
router.get('/rappels',   ctrl.rappelsVaccinaux);

module.exports = router;
