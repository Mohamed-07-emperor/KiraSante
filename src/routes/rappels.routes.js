const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rappels.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const validate = require('../middlewares/validate.middleware');
const { rappelSchema } = require('../validators/auth.validator');

router.use(auth);
router.post('/',      roles('agent','admin'), validate(rappelSchema), ctrl.creer);
router.get('/',       roles('agent','admin'), ctrl.lister);
router.delete('/:id', roles('agent','admin'), ctrl.annuler);

module.exports = router;
