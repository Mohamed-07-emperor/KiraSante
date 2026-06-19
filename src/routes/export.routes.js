const express = require('express');
const router = express.Router();
const multer = require('multer');
const ctrl = require('../controllers/export.controller');
const auth = require('../middlewares/auth.middleware');
const roles = require('../middlewares/roles.middleware');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.use(auth);
router.get('/pdf/patient/:id',   ctrl.exporterPDF);
router.get('/csv/patients',      roles('admin'), ctrl.exporterCSV);
router.post('/csv/import',       roles('admin'), upload.single('fichier'), ctrl.importerCSV);

module.exports = router;
