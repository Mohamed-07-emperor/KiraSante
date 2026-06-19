const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/consultations.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const { consultationSchema } = require('../validators/patient.validator');

router.use(auth);
router.post('/',                   roles('agent','admin'), validate(consultationSchema), ctrl.creer);
router.get('/patient/:patient_id', ctrl.parPatient);
router.delete('/:id',              roles('admin'), ctrl.supprimer);

module.exports = router;
