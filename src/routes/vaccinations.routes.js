const router = require('express').Router();
const { creer, parPatient } = require('../controllers/vaccinations.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.post('/',                    roles('agent','admin'), creer);
router.get('/patient/:patient_id',  parPatient);

module.exports = router;
