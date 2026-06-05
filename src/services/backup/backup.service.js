const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const logger = require('../../utils/logger');

const backupDir = path.join(__dirname, '../../../backups');

const creerBackup = async () => {
  try {
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fichier = path.join(backupDir, `kirasante_${date}.sql`);
    const cmd = `PGPASSWORD=${process.env.DB_PASSWORD} pg_dump -U ${process.env.DB_USER} -d ${process.env.DB_NAME} -f ${fichier}`;
    return new Promise((resolve) => {
      exec(cmd, (err) => {
        if (err) { logger.error('Erreur backup', err); resolve(null); return; }
        const taille = fs.statSync(fichier).size;
        logger.success(`Backup : ${fichier} (${Math.round(taille/1024)} KB)`);
        resolve(fichier);
      });
    });
  } catch (err) {
    logger.error('Erreur backup', err);
  }
};

const nettoyerVieuxBackups = async (joursMax = 7) => {
  try {
    if (!fs.existsSync(backupDir)) return;
    const fichiers = fs.readdirSync(backupDir);
    const maintenant = Date.now();
    let supprimes = 0;
    for (const f of fichiers) {
      const chemin = path.join(backupDir, f);
      const age = (maintenant - fs.statSync(chemin).mtimeMs) / 86400000;
      if (age > joursMax) { fs.unlinkSync(chemin); supprimes++; }
    }
    if (supprimes > 0) logger.info(`${supprimes} vieux backups supprimes`);
  } catch (err) {
    logger.error('Erreur nettoyage backups', err);
  }
};

module.exports = { creerBackup, nettoyerVieuxBackups };
