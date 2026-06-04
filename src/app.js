require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const compression = require('compression');
const hpp         = require('hpp');
const errorMiddleware = require('./middlewares/error.middleware');
const logger      = require('./utils/logger');

const app = express();

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(compression());
app.use(hpp());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://kirasante.bf'] : '*',
  methods: ['GET','POST','PUT','DELETE','PATCH'],
  allowedHeaders: ['Content-Type','Authorization']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Sanitisation XSS
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj === 'string') return obj.replace(/[<>]/g, '');
    if (typeof obj === 'object' && obj !== null) {
      for (const key of Object.keys(obj)) obj[key] = sanitize(obj[key]);
    }
    return obj;
  };
  if (req.body)  req.body  = sanitize(req.body);
  if (req.query) req.query = sanitize(req.query);
  next();
});

// Timeout 30s
app.use((req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ success:false, message:'Délai de requête dépassé' });
  });
  next();
});

// Logs HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => logger.http(req.method, req.url, res.statusCode, Date.now()-start));
  next();
});

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'KiraSante API operationnelle',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environnement: process.env.NODE_ENV,
    uptime: Math.floor(process.uptime()) + 's'
  });
});

const routes = require('./routes/index');
app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({ success:false, message:`Route introuvable : ${req.method} ${req.url}` });
});

app.use(errorMiddleware);

module.exports = app;
