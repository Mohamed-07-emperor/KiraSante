const { query, transaction } = require('../config/database');
const { success, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const synchroniser = async (req, res) => {
  try {
    const { donnees } = req.body;
    if (!donnees || !Array.isArray(donnees))
      return badRequest(res, 'Format invalide — tableau "donnees" requis');

    const resultats = [];

    await transaction(async (client) => {
      for (const item of donnees) {
        const { table_cible, operation, payload, record_id } = item;
        try {
          if (operation === 'INSERT') {
            const cols = Object.keys(payload).join(', ');
            const vals = Object.values(payload);
            const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
            await client.query(
              `INSERT INTO ${table_cible} (${cols}) VALUES (${placeholders}) ON CONFLICT (id) DO NOTHING`,
              vals
            );
          } else if (operation === 'UPDATE') {
            const sets = Object.keys(payload).map((k, i) => `${k}=$${i + 1}`).join(', ');
            const vals = [...Object.values(payload), record_id];
            await client.query(
              `UPDATE ${table_cible} SET ${sets} WHERE id=$${vals.length}`,
              vals
            );
          }
          resultats.push({ record_id, statut: 'synced' });
        } catch (e) {
          resultats.push({ record_id, statut: 'error', message: e.message });
        }
      }
    });

    logger.success(`Sync : ${resultats.length} enregistrements traités`);
    return success(res, { resultats }, 'Synchronisation terminée');
  } catch (err) {
    logger.error('Erreur synchronisation', err);
    return error(res, 'Erreur synchronisation', 500, err.message);
  }
};

module.exports = { synchroniser };
