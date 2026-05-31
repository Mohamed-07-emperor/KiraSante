const { query, transaction } = require('../../config/database');
const logger = require('../../utils/logger');

// Tables autorisées pour la synchronisation
const TABLES_AUTORISEES = [
  'patients', 'consultations', 'vaccinations', 'rappels_sms'
];

const traiterSync = async (donnees, agent_id) => {
  const resultats = { succes: 0, erreurs: 0, details: [] };

  await transaction(async (client) => {
    for (const item of donnees) {
      const { table_cible, operation, payload, record_id } = item;

      // Vérifier que la table est autorisée
      if (!TABLES_AUTORISEES.includes(table_cible)) {
        resultats.erreurs++;
        resultats.details.push({
          record_id,
          statut: 'erreur',
          message: `Table non autorisée : ${table_cible}`
        });
        continue;
      }

      try {
        if (operation === 'INSERT') {
          const cols = Object.keys(payload).join(', ');
          const vals = Object.values(payload);
          const placeholders = vals.map((_, i) => `$${i+1}`).join(', ');
          await client.query(
            `INSERT INTO ${table_cible} (${cols}) VALUES (${placeholders})
             ON CONFLICT (id) DO NOTHING`,
            vals
          );
        } else if (operation === 'UPDATE') {
          const sets = Object.keys(payload)
            .filter(k => k !== 'id')
            .map((k, i) => `${k}=$${i+1}`)
            .join(', ');
          const vals = [
            ...Object.values(payload).filter((_, i) => Object.keys(payload)[i] !== 'id'),
            record_id
          ];
          await client.query(
            `UPDATE ${table_cible} SET ${sets} WHERE id=$${vals.length}`,
            vals
          );
        }

        // Enregistrer dans sync_queue
        await client.query(
          `INSERT INTO sync_queue (table_cible, record_id, operation, payload, agent_id, synced_at)
           VALUES ($1, $2, $3, $4, $5, NOW())`,
          [table_cible, record_id, operation, JSON.stringify(payload), agent_id]
        );

        resultats.succes++;
        resultats.details.push({ record_id, statut: 'synced' });
      } catch (err) {
        resultats.erreurs++;
        resultats.details.push({
          record_id,
          statut: 'erreur',
          message: err.message
        });
        logger.error(`Sync erreur ${table_cible}/${record_id}`, err);
      }
    }
  });

  logger.success(`Sync terminée : ${resultats.succes} succès, ${resultats.erreurs} erreurs`);
  return resultats;
};

const getStatutSync = async (agent_id) => {
  const result = await query(
    `SELECT table_cible, operation, COUNT(*) as total
     FROM sync_queue
     WHERE agent_id=$1
     GROUP BY table_cible, operation
     ORDER BY table_cible`,
    [agent_id]
  );
  return result.rows;
};

module.exports = { traiterSync, getStatutSync };
