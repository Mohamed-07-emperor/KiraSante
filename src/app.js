require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const errorMiddleware = require('./middlewares/error.middleware');
const logger = require('./utils/logger');

const app = express();

app.use(helmet());
app.use(cors({ origin:'*', methods:['GET','POST','PUT','DELETE'], allowedHeaders:['Content-Type','Authorization'] }));
app.use(express.json({ limit:'10mb' }));
app.use(express.urlencoded({ extended:true }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => logger.http(req.method, req.url, res.statusCode, Date.now()-start));
  next();
});

app.get('/health', (req, res) => {
  res.json({ success:true, message:'KiraSante API operationnelle', version:'1.0.0', timestamp:new Date().toISOString() });
});

const routes = require('./routes/index');
app.use('/api/v1', routes);

app.use((req, res) => {
  res.status(404).json({ success:false, message:'Route introuvable : '+req.method+' '+req.url });
});

app.use(errorMiddleware);

module.exports = app;
