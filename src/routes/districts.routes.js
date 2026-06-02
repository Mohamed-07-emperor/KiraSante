const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/districts.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

router.use(auth);
router.get('/',      ctrl.lister);
router.get('/:id',   ctrl.obtenir);
router.post('/',     roles('admin'), ctrl.creer);
router.put('/:id',   roles('admin'), ctrl.modifier);

module.exports = router;
