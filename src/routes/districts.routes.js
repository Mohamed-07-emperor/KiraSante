const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/districts.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');
const { cacheMiddleware, invalidateCache } = require('../middlewares/cache.middleware');

router.use(auth);
router.get('/',    cacheMiddleware(3600, 'districts'), ctrl.lister);
router.get('/:id', cacheMiddleware(3600, 'districts'), ctrl.obtenir);
router.post('/',   roles('admin'), ctrl.creer);
router.put('/:id', roles('admin'), ctrl.modifier);

module.exports = router;
