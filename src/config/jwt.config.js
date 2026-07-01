// Configuration JWT
const JWT_SECRET = process.env.JWT_SECRET || 'kirasante_jwt_secret_burkina_faso_2026_kira';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

module.exports = { JWT_SECRET, JWT_EXPIRES_IN };
