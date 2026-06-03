const express = require('express');
const router = express.Router();
const { enregistrerTokenFCM } = require('../services/notifications/fcm.service');
const { success, badRequest, error } = require('../utils/response.utils');
const auth = require('../middlewares/auth.middleware');

router.use(auth);

router.post('/fcm-token', async (req, res) => {
  try {
    const { fcm_token } = req.body;
    if (!fcm_token) return badRequest(res, 'Token FCM requis');
    await enregistrerTokenFCM(req.user.id, fcm_token);
    return success(res, {}, 'Token FCM enregistré');
  } catch (err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
});

module.exports = router;
