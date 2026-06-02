const express = require('express');
const router = express.Router();
const { exporter } = require('../controllers/dhis2.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

router.use(auth);
router.get('/export', roles('admin'), exporter);

module.exports = router;
