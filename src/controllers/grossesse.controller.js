const { query } = require('../config/database');
const { success, badRequest, notFound, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

// Calculer semaine de grossesse
const calculerSemaine = (dateRegles) => {
  const diff = new Date() - new Date(dateRegles);
  return Math.floor(diff / (7 * 24 * 60 * 60 * 1000));
};

// Calculer date accouchement prevue (DDR + 280 jours)
const calculerDDA = (dateRegles) => {
  const dda = new Date(dateRegles);
  dda.setDate(dda.getDate() + 280);
  return dda.toISOString().split('T')[0];
};

// Conseils par trimestre
const conseilsGrossesse = (semaine) => {
  if (semaine <= 13) return {
    trimestre: 1,
    conseil_fr: 'Prenez de l acide folique. Evitez l alcool et le tabac. Consultez un medecin.',
    conseil_moore: 'Mu acide folique. Zab damba la alkol la tabac. Ko dogtore.',
    conseil_dioula: 'To acide folique. Bali dolo ni tabaki. Taa doktoro fɛ.'
  };
  if (semaine <= 26) return {
    trimestre: 2,
    conseil_fr: 'Mangez equilibre. Dormez sur le cote gauche. Faites vos analyses.',
    conseil_moore: 'Di riki. Dog ne-bila. Ko analyses.',
    conseil_dioula: 'Dumu cogoya la. Sɔrɔ nkɔrɔfɛ. To analyses kɛ.'
  };
  return {
    trimestre: 3,
    conseil_fr: 'Preparez votre sac de maternite. Consultez chaque semaine. Signes d alarme: saignements, douleurs fortes.',
    conseil_moore: 'Prepare sac maternite. Ko dogtore kand-kand. Signe danger: zug-zug, nin yeel.',
    conseil_dioula: 'Labɛn maternite saki. Taa doktoro kɔnɔ kɔnɔ. Kɛnɛya dimi: joli, basici.'
  };
};

// Calendrier CPN recommande
const calendrierCPN = (dateRegles) => {
  const ddr = new Date(dateRegles);
  return [
    { numero: 1, semaine: 12, date: new Date(ddr.getTime() + 12*7*24*60*60*1000).toISOString().split('T')[0] },
    { numero: 2, semaine: 20, date: new Date(ddr.getTime() + 20*7*24*60*60*1000).toISOString().split('T')[0] },
    { numero: 3, semaine: 28, date: new Date(ddr.getTime() + 28*7*24*60*60*1000).toISOString().split('T')[0] },
    { numero: 4, semaine: 32, date: new Date(ddr.getTime() + 32*7*24*60*60*1000).toISOString().split('T')[0] },
    { numero: 5, semaine: 34, date: new Date(ddr.getTime() + 34*7*24*60*60*1000).toISOString().split('T')[0] },
    { numero: 6, semaine: 36, date: new Date(ddr.getTime() + 36*7*24*60*60*1000).toISOString().split('T')[0] },
    { numero: 7, semaine: 38, date: new Date(ddr.getTime() + 38*7*24*60*60*1000).toISOString().split('T')[0] },
    { numero: 8, semaine: 40, date: new Date(ddr.getTime() + 40*7*24*60*60*1000).toISOString().split('T')[0] }
  ];
};

// Declarer une grossesse (patient)
const declarerGrossesse = async (req, res) => {
  try {
    const { date_dernieres_regles, notes } = req.body;
    const patient_id = req.user.id;
    if (!date_dernieres_regles) return badRequest(res, 'Date des dernieres regles requise');

    const existante = await query(
      'SELECT id FROM grossesses WHERE patient_id=$1 AND statut=$2',
      [patient_id, 'en_cours']
    );
    if (existante.rows.length) return badRequest(res, 'Une grossesse est deja en cours');

    const semaine = calculerSemaine(date_dernieres_regles);
    const dda = calculerDDA(date_dernieres_regles);

    const r = await query(
      `INSERT INTO grossesses (patient_id, date_dernieres_regles, date_accouchement_prevue, semaine_actuelle, notes)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [patient_id, date_dernieres_regles, dda, semaine, notes]
    );

    const conseils = conseilsGrossesse(semaine);
    const calendrier = calendrierCPN(date_dernieres_regles);

    logger.success(`Grossesse declaree: patient ${patient_id} - SA ${semaine}`);
    return success(res, {
      grossesse: r.rows[0],
      semaine_actuelle: semaine,
      date_accouchement_prevue: dda,
      conseils,
      calendrier_cpn: calendrier
    }, 'Grossesse enregistree avec succes');
  } catch(err) {
    logger.error('Erreur declarerGrossesse', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Voir ma grossesse (patient)
const maGrossesse = async (req, res) => {
  try {
    const patient_id = req.user.id;
    const r = await query(
      `SELECT g.*, a.prenom as agent_prenom, a.nom as agent_nom
       FROM grossesses g
       LEFT JOIN agents a ON g.agent_id = a.id
       WHERE g.patient_id=$1 AND g.statut='en_cours'
       ORDER BY g.created_at DESC LIMIT 1`,
      [patient_id]
    );
    if (!r.rows.length) return success(res, { grossesse: null }, 'Aucune grossesse en cours');

    const grossesse = r.rows[0];
    const semaine = calculerSemaine(grossesse.date_dernieres_regles);
    const conseils = conseilsGrossesse(semaine);
    const calendrier = calendrierCPN(grossesse.date_dernieres_regles);

    const cpns = await query(
      'SELECT * FROM consultations_cpn WHERE grossesse_id=$1 ORDER BY numero_cpn',
      [grossesse.id]
    );

    return success(res, {
      grossesse,
      semaine_actuelle: semaine,
      conseils,
      calendrier_cpn: calendrier,
      cpns_effectuees: cpns.rows
    });
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Lister grossesses (agent/admin)
const listerGrossesses = async (req, res) => {
  try {
    const r = await query(
      `SELECT g.*, p.prenom, p.nom, p.telephone,
        (SELECT COUNT(*) FROM consultations_cpn WHERE grossesse_id=g.id) as cpn_effectuees
       FROM grossesses g
       JOIN patients p ON g.patient_id = p.id
       WHERE g.statut='en_cours'
       ORDER BY g.date_accouchement_prevue ASC`
    );
    return success(res, { grossesses: r.rows, total: r.rows.length });
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Enregistrer une CPN (agent)
const enregistrerCPN = async (req, res) => {
  try {
    const { grossesse_id, numero_cpn, date_cpn, poids, tension_arterielle,
            hauteur_uterine, position_foetus, fcf, observations, prochaine_cpn } = req.body;
    const agent_id = req.user.id;

    if (!grossesse_id || !numero_cpn || !date_cpn) return badRequest(res, 'Champs requis manquants');

    const grossesse = await query('SELECT * FROM grossesses WHERE id=$1', [grossesse_id]);
    if (!grossesse.rows.length) return notFound(res, 'Grossesse introuvable');

    const r = await query(
      `INSERT INTO consultations_cpn
       (grossesse_id, patient_id, agent_id, numero_cpn, date_cpn, poids, tension_arterielle,
        hauteur_uterine, position_foetus, fcf, observations, prochaine_cpn)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [grossesse_id, grossesse.rows[0].patient_id, agent_id, numero_cpn, date_cpn,
       poids, tension_arterielle, hauteur_uterine, position_foetus, fcf, observations, prochaine_cpn]
    );

    await query(
      'UPDATE grossesses SET nombre_cpn=$1, updated_at=NOW() WHERE id=$2',
      [numero_cpn, grossesse_id]
    );

    return success(res, { cpn: r.rows[0] }, 'CPN enregistree avec succes');
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

// Cloturer grossesse
const cloturerGrossesse = async (req, res) => {
  try {
    const { id } = req.params;
    const { statut_final } = req.body;
    await query(
      'UPDATE grossesses SET statut=$1, updated_at=NOW() WHERE id=$2',
      [statut_final || 'accouchee', id]
    );
    return success(res, {}, 'Grossesse cloturee');
  } catch(err) {
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { declarerGrossesse, maGrossesse, listerGrossesses, enregistrerCPN, cloturerGrossesse };
