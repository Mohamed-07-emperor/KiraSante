const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/patients.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const { patientSchema } = require('../validators/patient.validator');

router.use(auth);
router.post('/',        roles('agent','admin'), validate(patientSchema), ctrl.creer);
router.get('/',         roles('agent','admin'), ctrl.lister);
router.get('/qr/:code', roles('agent','admin'), ctrl.parQRCode);
router.get('/:id',      ctrl.obtenir);
router.put('/:id',      roles('agent','admin'), ctrl.modifier);

module.exports = router;
