require('dotenv').config();
// Fallback JWT_SECRET pour production
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'kirasante_jwt_secret_burkina_faso_2026_kira';
}
const app = require('./app');
const { migrer, migrerNouvellesTables } = require('./database/migrate');
const { pool } = require('./config/database');
const { demarrerCrons } = require('./services/cron');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3000;

const demarrer = async () => {
  try {
    await pool.query('SELECT NOW()');
    logger.success('Connexion PostgreSQL établie');

    migrer().catch(err => console.warn('Migration warning:', err.message));
migrerNouvellesTables().catch(err => console.warn('Migration nouvelles tables:', err.message));
app.listen(PORT, () => {
      logger.success(`🚀 KiraSante API démarrée sur le port ${PORT}`);
      logger.info(`📍 Environnement : ${process.env.NODE_ENV}`);
      logger.info(`🌐 Health check : http://localhost:${PORT}/health`);
    });

    // Démarrer les tâches planifiées
    demarrerCrons();

  } catch (err) {
    logger.error('Impossible de démarrer le serveur', err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  logger.warn('Arrêt du serveur...');
  await pool.end();
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  logger.error('Exception non capturée', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Promesse rejetée non gérée', reason);
  process.exit(1);
});

demarrer();
