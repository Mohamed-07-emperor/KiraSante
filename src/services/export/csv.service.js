const logger = require('../../utils/logger');

const exporterPatients = (patients, res) => {
  try {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=patients_kirasante.csv');

    const entetes = ['ID','QR Code','Nom','Prénom','Date Naissance','Sexe','Groupe Sanguin','Téléphone','Langue','District','Créé le'];
    const lignes = patients.map(p => [
      p.id, p.qr_code, p.nom, p.prenom,
      new Date(p.date_naissance).toLocaleDateString('fr-FR'),
      p.sexe, p.groupe_sanguin || '', p.telephone || '',
      p.langue, p.district_id || '',
      new Date(p.created_at).toLocaleDateString('fr-FR')
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

    const csv = [entetes.join(','), ...lignes].join('\n');
    res.send('\uFEFF' + csv); // BOM pour Excel
    logger.success('Export CSV : ' + patients.length + ' patients');
  } catch (err) {
    logger.error('Erreur export CSV', err);
    res.status(500).json({ success: false, message: 'Erreur export CSV' });
  }
};

const importerPatients = async (contenu) => {
  const lignes = contenu.split('\n').filter(l => l.trim());
  const entete = lignes[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const patients = [];
  const erreurs = [];

  for (let i = 1; i < lignes.length; i++) {
    try {
      const valeurs = lignes[i].split(',').map(v => v.trim().replace(/"/g, ''));
      const patient = {};
      entete.forEach((h, idx) => { patient[h.toLowerCase()] = valeurs[idx] || null; });

      if (!patient.nom || !patient.prenom || !patient.date_naissance || !patient.sexe) {
        erreurs.push({ ligne: i + 1, erreur: 'Champs obligatoires manquants (nom, prenom, date_naissance, sexe)' });
        continue;
      }

      patients.push({
        nom:            patient.nom,
        prenom:         patient.prenom,
        date_naissance: patient.date_naissance,
        sexe:           patient.sexe?.toUpperCase(),
        groupe_sanguin: patient.groupe_sanguin || null,
        telephone:      patient.telephone || null,
        langue:         patient.langue || 'fr'
      });
    } catch (err) {
      erreurs.push({ ligne: i + 1, erreur: err.message });
    }
  }

  return { patients, erreurs };
};

module.exports = { exporterPatients, importerPatients };
