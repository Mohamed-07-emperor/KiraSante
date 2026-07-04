const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const ctrl = require('../controllers/grossesse.controller');

router.use(auth);

// Patient
router.post('/declarer',     ctrl.declarerGrossesse);
router.get('/ma-grossesse',  ctrl.maGrossesse);

// Agent/Admin
router.get('/liste',              roles('agent','admin'), ctrl.listerGrossesses);
router.get('/patient/:id',        roles('agent','admin'), ctrl.grossesseParPatient);
router.post('/cpn',               roles('agent','admin'), ctrl.enregistrerCPN);
router.put('/:id/cloturer',       roles('agent','admin'), ctrl.cloturerGrossesse);

module.exports = router;
