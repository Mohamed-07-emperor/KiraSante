const PDFDocument = require('pdfkit');
const logger = require('../../utils/logger');

const genererCarnetSante = (dossier, res) => {
  try {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=carnet_${dossier.patient.qr_code}.pdf`);
    doc.pipe(res);

    // En-tête
    doc.fontSize(20).fillColor('#1B7A3E').text('KiraSante BF', { align: 'center' });
    doc.fontSize(14).fillColor('#E8640C').text('Carnet de Santé Numérique', { align: 'center' });
    doc.fontSize(10).fillColor('#666').text('Système Intelligent de Suivi Sanitaire — Burkina Faso', { align: 'center' });
    doc.moveDown();

    // Ligne séparatrice
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1B7A3E').stroke();
    doc.moveDown();

    // Infos patient
    const p = dossier.patient;
    doc.fontSize(14).fillColor('#1B7A3E').text('INFORMATIONS DU PATIENT');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#000');
    doc.text(`Nom complet   : ${p.nom} ${p.prenom}`);
    doc.text(`Date naissance : ${new Date(p.date_naissance).toLocaleDateString('fr-FR')}`);
    doc.text(`Sexe          : ${p.sexe === 'M' ? 'Masculin' : 'Féminin'}`);
    doc.text(`Groupe sanguin : ${p.groupe_sanguin || 'Non renseigné'}`);
    doc.text(`Allergies     : ${p.allergies || 'Aucune connue'}`);
    doc.text(`Téléphone     : ${p.telephone || 'Non renseigné'}`);
    doc.text(`QR Code       : ${p.qr_code}`);
    doc.text(`Langue        : ${p.langue}`);
    doc.moveDown();

    // Résumé
    const r = dossier.resume;
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#E8640C').stroke();
    doc.moveDown();
    doc.fontSize(14).fillColor('#1B7A3E').text('RÉSUMÉ MÉDICAL');
    doc.moveDown(0.5);
    doc.fontSize(11).fillColor('#000');
    doc.text(`Total consultations : ${r.total_consultations}`);
    doc.text(`Total vaccinations  : ${r.total_vaccinations}`);
    doc.text(`Dernière consultation : ${r.derniere_consultation ? new Date(r.derniere_consultation).toLocaleDateString('fr-FR') : 'Aucune'}`);
    if (r.prochain_vaccin) {
      doc.text(`Prochain vaccin : ${r.prochain_vaccin.vaccin_nom} le ${new Date(r.prochain_vaccin.prochain_rappel).toLocaleDateString('fr-FR')}`);
    }
    doc.moveDown();

    // Vaccinations
    if (dossier.vaccinations.length > 0) {
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1B7A3E').stroke();
      doc.moveDown();
      doc.fontSize(14).fillColor('#1B7A3E').text('CARNET VACCINAL');
      doc.moveDown(0.5);
      dossier.vaccinations.forEach((v, i) => {
        doc.fontSize(11).fillColor('#000');
        doc.text(`${i+1}. ${v.vaccin_nom} — ${new Date(v.date_admin).toLocaleDateString('fr-FR')}${v.prochain_rappel ? ` (Rappel: ${new Date(v.prochain_rappel).toLocaleDateString('fr-FR')})` : ''}`);
      });
      doc.moveDown();
    }

    // Consultations
    if (dossier.consultations.length > 0) {
      doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#1B7A3E').stroke();
      doc.moveDown();
      doc.fontSize(14).fillColor('#1B7A3E').text('HISTORIQUE DES CONSULTATIONS');
      doc.moveDown(0.5);
      dossier.consultations.slice(0, 10).forEach((c, i) => {
        doc.fontSize(11).fillColor('#333').text(`${i+1}. ${new Date(c.date_consultation).toLocaleDateString('fr-FR')} — ${c.motif}`);
        if (c.diagnostic) doc.fontSize(10).fillColor('#555').text(`   Diagnostic : ${c.diagnostic}`);
        if (c.traitement) doc.fontSize(10).fillColor('#555').text(`   Traitement : ${c.traitement}`);
        doc.moveDown(0.3);
      });
    }

    // Pied de page
    doc.fontSize(9).fillColor('#999').text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')} — KiraSante BF v1.0.0`,
      { align: 'center' }
    );

    doc.end();
    logger.success('PDF généré pour patient ' + p.qr_code);
  } catch (err) {
    logger.error('Erreur génération PDF', err);
    res.status(500).json({ success: false, message: 'Erreur génération PDF' });
  }
};

module.exports = { genererCarnetSante };
