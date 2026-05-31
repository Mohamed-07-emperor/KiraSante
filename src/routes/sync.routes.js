const router = require('express').Router();
const { synchroniser } = require('../controllers/sync.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const { sync } = require('../middlewares/rateLimit.middleware');

router.use(authMiddleware);
router.post('/', sync, synchroniser);

module.exports = router;
