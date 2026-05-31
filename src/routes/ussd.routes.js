const router = require('express').Router();
const { webhook } = require('../controllers/ussd.controller');

router.post('/webhook', webhook);

module.exports = router;
