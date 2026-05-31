require('dotenv').config();
const express  = require('express');
const cors     = require('cors');
const helmet   = require('helmet');
const morgan   = require('morgan');

const { general } = require('./middlewares/rateLimit.middleware');
const errorMiddleware = require('./middlewares/error.middleware');
const logger = require('./utils/logger');
const routes = require('./routes/index');

const app = express();

// Sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://kirasante.bf']
    : '*',
  methods: ['GET','POST','PUT','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}));

// Rate limiting global
app.use(general);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logs HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.http(req.method, req.url, res.statusCode, Date.now() - start);
  });
  next();
});

// Route de santé
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'KiraSante API opérationnelle',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environnement: process.env.NODE_ENV
  });
});

// Routes principales
app.use('/api/v1', routes);

// Route inconnue
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route introuvable : ${req.method} ${req.url}`
  });
});

// Gestion globale des erreurs
app.use(errorMiddleware);

module.exports = app;
