const express = require('express');
const router = express.Router();
const { traduireMot, rechercher, traduireTexte, lister } = require('../controllers/traduction.controller');
const auth = require('../middlewares/auth.middleware');
const { cacheMiddleware } = require('../middlewares/cache.middleware');

router.use(auth);
router.get('/traduire',    cacheMiddleware(3600, 'traduction'), traduireMot);
router.get('/rechercher',  cacheMiddleware(3600, 'traduction'), rechercher);
router.post('/ordonnance', traduireTexte);
router.get('/termes',      cacheMiddleware(86400, 'traduction'), lister);

module.exports = router;
