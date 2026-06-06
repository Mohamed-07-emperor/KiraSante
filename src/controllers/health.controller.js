const { healthCheck } = require('../config/database');
const cache = require('../services/cache/cache.service');
const os = require('os');

const check = async (req, res) => {
  const start = Date.now();
  const db = await healthCheck();
  const mem = process.memoryUsage();

  return res.status(db.status === 'ok' ? 200 : 503).json({
    success:       db.status === 'ok',
    message:       db.status === 'ok' ? 'KiraSante API operationnelle' : 'Service degrade',
    version:       '1.0.0',
    timestamp:     new Date().toISOString(),
    latence:       Date.now() - start + 'ms',
    environnement: process.env.NODE_ENV,
    uptime:        Math.floor(process.uptime()) + 's',
    base_de_donnees: db,
    cache:         cache.getStats(),
    systeme: {
      nodeVersion: process.version,
      memoire: {
        utilisee: Math.round(mem.heapUsed / 1024 / 1024) + ' MB',
        totale:   Math.round(mem.heapTotal / 1024 / 1024) + ' MB',
        rss:      Math.round(mem.rss / 1024 / 1024) + ' MB'
      },
      cpu:      { coeurs: os.cpus().length, charge: os.loadavg()[0].toFixed(2) },
      memLibre: Math.round(os.freemem() / 1024 / 1024) + ' MB'
    }
  });
};

module.exports = { check };
