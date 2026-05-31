const router = require('express').Router();
const { creer, obtenir, parQRCode, lister, modifier } = require('../controllers/patients.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

router.use(authMiddleware);

router.post('/',              roles('agent','admin'), creer);
router.get('/',               roles('agent','admin'), lister);
router.get('/qr/:code',       roles('agent','admin'), parQRCode);
router.get('/:id',            obtenir);
router.put('/:id',            roles('agent','admin'), modifier);

module.exports = router;
