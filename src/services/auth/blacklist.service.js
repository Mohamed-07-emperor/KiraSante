const { query } = require('../../config/database');
const crypto = require('crypto');
const logger = require('../../utils/logger');

const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const blacklister = async (token, agent_id, expire_at) => {
  try {
    const hash = hashToken(token);
    await query(
      `INSERT INTO token_blacklist (token_hash, agent_id, expire_at)
       VALUES ($1, $2, $3) ON CONFLICT (token_hash) DO NOTHING`,
      [hash, agent_id, new Date(expire_at * 1000)]
    );
    return true;
  } catch (err) {
    logger.error('Erreur blacklist token', err);
    return false;
  }
};

const estBlackliste = async (token) => {
  try {
    const hash = hashToken(token);
    const result = await query(
      'SELECT id FROM token_blacklist WHERE token_hash=$1 AND expire_at > NOW()',
      [hash]
    );
    return result.rows.length > 0;
  } catch (err) {
    logger.error('Erreur verification blacklist', err);
    return false;
  }
};

const nettoyerExpires = async () => {
  try {
    const result = await query('DELETE FROM token_blacklist WHERE expire_at < NOW()');
    logger.info(`Blacklist nettoyee : ${result.rowCount} tokens supprimes`);
  } catch (err) {
    logger.error('Erreur nettoyage blacklist', err);
  }
};

module.exports = { blacklister, estBlackliste, nettoyerExpires, hashToken };
