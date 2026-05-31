const router = require('express').Router();

router.use('/auth',          require('./auth.routes'));
router.use('/patients',      require('./patients.routes'));
router.use('/consultations', require('./consultations.routes'));
router.use('/vaccinations',  require('./vaccinations.routes'));
router.use('/alertes',       require('./alertes.routes'));
router.use('/sync',          require('./sync.routes'));
router.use('/ussd',          require('./ussd.routes'));

module.exports = router;
