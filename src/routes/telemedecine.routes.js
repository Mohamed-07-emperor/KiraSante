const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const ctrl = require('../controllers/telemedecine.controller');

router.use(auth);

// Patient
router.post('/demandes',                    ctrl.creerDemande);
router.get('/demandes/mes-demandes',        ctrl.mesDemandesPatient);
router.get('/demandes/:id/messages',        ctrl.voirMessages);
router.post('/demandes/:id/messages',       ctrl.envoyerMessage);
router.get('/ordonnances/mes-ordonnances',  ctrl.mesOrdonnances);

// Agent
router.get('/demandes/en-attente',          roles('agent','admin'), ctrl.demandesEnAttente);
router.put('/demandes/:id/prendre-charge',  roles('agent','admin'), ctrl.prendreEnCharge);
router.post('/demandes/:id/ordonnance',     roles('agent','admin'), ctrl.creerOrdonnance);
router.put('/demandes/:id/cloturer',        roles('agent','admin'), ctrl.cloturerDemande);

module.exports = router;
