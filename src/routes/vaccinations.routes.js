const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/vaccinations.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const { vaccinationSchema } = require('../validators/patient.validator');

router.use(auth);
router.post('/',                   roles('agent','admin'), validate(vaccinationSchema), ctrl.creer);
router.get('/patient/:patient_id', ctrl.parPatient);
router.delete('/:id',              roles('admin'), ctrl.supprimer);

module.exports = router;
