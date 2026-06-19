const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/patients.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const audit = require('../middlewares/audit.middleware');
const { patientSchema } = require('../validators/patient.validator');

router.use(auth);
router.post('/',        roles('agent','admin'), validate(patientSchema), audit('CREATE_PATIENT','patients'), ctrl.creer);
router.get('/',         roles('agent','admin'), ctrl.lister);
router.get('/qr/:code', roles('agent','admin'), ctrl.parQRCode);
router.get('/:id',      ctrl.obtenir);
router.put('/:id',      roles('agent','admin'), audit('UPDATE_PATIENT','patients'), ctrl.modifier);
router.delete('/:id',   roles('admin'), audit('DELETE_PATIENT','patients'), ctrl.supprimer);

module.exports = router;
