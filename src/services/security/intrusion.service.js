const { query } = require('../../config/database');
const logger = require('../../utils/logger');

const MAX_TENTATIVES_IP  = 20;
const MAX_TENTATIVES_TEL = 5;
const FENETRE_MINUTES    = 15;

const enregistrerTentative = async (ip_address, telephone, succes) => {
  try {
    await query(
      'INSERT INTO tentatives_connexion (ip_address, telephone, succes) VALUES ($1,$2,$3)',
      [ip_address, telephone || null, succes]
    );
  } catch (err) {
    logger.error('Erreur enregistrement tentative', err);
  }
};

const verifierBlocage = async (ip_address, telephone) => {
  try {
    const fenetre = new Date(Date.now() - FENETRE_MINUTES * 60 * 1000);
    const [parIP, parTel] = await Promise.all([
      query('SELECT COUNT(*) FROM tentatives_connexion WHERE ip_address=$1 AND succes=false AND created_at > $2', [ip_address, fenetre]),
      telephone ? query('SELECT COUNT(*) FROM tentatives_connexion WHERE telephone=$1 AND succes=false AND created_at > $2', [telephone, fenetre]) : Promise.resolve({ rows: [{ count: 0 }] })
    ]);
    const tentativesIP  = parseInt(parIP.rows[0].count);
    const tentativesTel = parseInt(parTel.rows[0].count);
    if (tentativesIP >= MAX_TENTATIVES_IP) {
      logger.warn(`IP bloquee : ${ip_address}`);
      return { bloque: true, raison: 'Trop de tentatives depuis cette adresse IP' };
    }
    if (tentativesTel >= MAX_TENTATIVES_TEL) {
      logger.warn(`Telephone bloque : ${telephone}`);
      return { bloque: true, raison: 'Trop de tentatives. Reessayez dans 15 minutes' };
    }
    return { bloque: false };
  } catch (err) {
    logger.error('Erreur verification blocage', err);
    return { bloque: false };
  }
};

const nettoyerAnciennesTentatives = async () => {
  try {
    const result = await query("DELETE FROM tentatives_connexion WHERE created_at < NOW() - INTERVAL '24 hours'");
    logger.info(`${result.rowCount} tentatives nettoyees`);
  } catch (err) {
    logger.error('Erreur nettoyage tentatives', err);
  }
};

module.exports = { enregistrerTentative, verifierBlocage, nettoyerAnciennesTentatives };
