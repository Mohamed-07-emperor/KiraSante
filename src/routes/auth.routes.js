const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const rateLimitMiddleware = require('../middlewares/rateLimit.middleware');

router.post('/register',           rateLimitMiddleware.auth, authController.register);
router.post('/login',              rateLimitMiddleware.auth, authController.login);
router.post('/refresh',            authController.refresh);
router.get('/me',                  authMiddleware, authController.me);
router.put('/changer-mot-de-passe', authMiddleware, authController.changerMotDePasse);

module.exports = router;
