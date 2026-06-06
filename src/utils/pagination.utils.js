const { query } = require('../config/database');

// Pagination par offset classique
const paginer = async (table, conditions = {}, options = {}) => {
  const { page = 1, limite = 20, orderBy = 'created_at', orderDir = 'DESC' } = options;
  const offset = (parseInt(page) - 1) * parseInt(limite);

  const whereKeys = Object.keys(conditions);
  const whereValues = Object.values(conditions);
  const where = whereKeys.length > 0
    ? 'WHERE ' + whereKeys.map((k, i) => `${k}=$${i + 1}`).join(' AND ')
    : '';

  const countResult = await query(`SELECT COUNT(*) FROM ${table} ${where}`, whereValues);
  const total = parseInt(countResult.rows[0].count);

  const result = await query(
    `SELECT * FROM ${table} ${where}
     ORDER BY ${orderBy} ${orderDir}
     LIMIT $${whereValues.length + 1}
     OFFSET $${whereValues.length + 2}`,
    [...whereValues, parseInt(limite), offset]
  );

  return {
    data: result.rows,
    pagination: {
      total,
      page:   parseInt(page),
      limite: parseInt(limite),
      pages:  Math.ceil(total / parseInt(limite)),
      suivant: parseInt(page) < Math.ceil(total / parseInt(limite)) ? parseInt(page) + 1 : null,
      precedent: parseInt(page) > 1 ? parseInt(page) - 1 : null
    }
  };
};

// Pagination par curseur (plus performante pour grandes tables)
const paginerParCurseur = async (sql, params = [], options = {}) => {
  const { curseur = null, limite = 20 } = options;

  let requete = sql;
  let nouveauxParams = [...params];

  if (curseur) {
    const decoded = Buffer.from(curseur, 'base64').toString('utf8');
    const { id, date } = JSON.parse(decoded);
    requete += ` AND (created_at < '${date}' OR (created_at = '${date}' AND id < '${id}'))`;
  }

  requete += ` ORDER BY created_at DESC, id DESC LIMIT $${nouveauxParams.length + 1}`;
  nouveauxParams.push(parseInt(limite) + 1);

  const result = await query(requete, nouveauxParams);
  const rows = result.rows;

  const aPlus = rows.length > parseInt(limite);
  const donnees = aPlus ? rows.slice(0, parseInt(limite)) : rows;

  let prochainCurseur = null;
  if (aPlus && donnees.length > 0) {
    const dernier = donnees[donnees.length - 1];
    prochainCurseur = Buffer.from(JSON.stringify({
      id:   dernier.id,
      date: dernier.created_at
    })).toString('base64');
  }

  return {
    data: donnees,
    pagination: {
      limite:          parseInt(limite),
      aPlus,
      prochainCurseur,
      total:           donnees.length
    }
  };
};

module.exports = { paginer, paginerParCurseur };
