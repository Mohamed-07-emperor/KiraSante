const router = require('express').Router();
const { lister, actives, resoudre } = require('../controllers/alertes.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.get('/',              lister);
router.get('/actives',       actives);
router.put('/:id/resoudre',  roles('admin'), resoudre);

module.exports = router;
