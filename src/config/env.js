require('dotenv').config();

const required = [
  'DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD',
  'ENCRYPTION_KEY'
];

const missing = required.filter(key => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Variables manquantes : ${missing.join(', ')}`);
  process.exit(1);
}

module.exports = {
  port:    process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  db: {
    host:     process.env.DB_HOST,
    port:     parseInt(process.env.DB_PORT),
    name:     process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
  jwt: {
    secret:         process.env.JWT_SECRET || 'kirasante_jwt_secret_burkina_faso_2026_kira',
    expiresIn:      process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret:  process.env.JWT_REFRESH_SECRET || 'kirasante_jwt_refresh_burkina_2026',
    refreshExpires: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  encryption: {
    key: process.env.ENCRYPTION_KEY,
  },
  africasTalking: {
    apiKey:   process.env.AT_API_KEY,
    username: process.env.AT_USERNAME,
    senderId: process.env.AT_SENDER_ID,
  },
  alertes: {
    rayonKm: parseFloat(process.env.CLUSTER_RADIUS_KM) || 10,
    minCas:  parseInt(process.env.CLUSTER_MIN_CASES) || 5,
    heures:  parseInt(process.env.CLUSTER_TIME_HOURS) || 72,
  }
};
