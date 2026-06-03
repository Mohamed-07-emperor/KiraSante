const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rappels.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

router.use(auth);
router.post('/',         roles('agent','admin'), ctrl.creer);
router.get('/',          roles('agent','admin'), ctrl.lister);
router.delete('/:id',    roles('agent','admin'), ctrl.annuler);

module.exports = router;
