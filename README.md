‎KiraSante BF — API Backend v1.0.0
‎
‎Système Intelligent de Suivi Sanitaire Multilingue et Hors Ligne pour les Communautés du Burkina Faso
‎
‎Équipe KIRA : SANON Mohamed · DRABO Faïssale · TAMBOURA Evelyne
‎INGENOVA 2026 — Orange Digital Center — Ouagadougou, Burkina Faso
‎
‎---
‎
‎Stack Technique
‎Runtime : Node.js v18+
‎Framework : Express.js
‎Base de données : PostgreSQL 15
‎Authentification : JWT + Blacklist + OTP SMS
‎Sécurité : AES-256, bcrypt, Helmet, HPP, Rate Limiting, Détection Intrusion
‎SMS/USSD : Africa's Talking
‎Push : Firebase Cloud Messaging
‎Cache : Mémoire (MemoryCache)
‎Documentation : Swagger/OpenAPI 3.0
‎
‎---
‎
‎Installation rapide
‎
‎1. Cloner le projet
‎git clone https://github.com/Mohamed-07-emperor/KiraSante.git
‎cd KiraSante
‎
‎2. Installer les dépendances
‎npm install
‎
‎3. Configurer l'environnement
‎cp .env.example .env
‎Éditer .env avec vos valeurs
‎
‎4. Démarrer PostgreSQL
‎pg_ctl -D $PREFIX/var/lib/postgresql start
‎
‎5. Créer la base de données
‎psql -U postgres
‎CREATE USER kirasante_user WITH ENCRYPTED PASSWORD 'votre_mot_de_passe';
‎CREATE DATABASE kirasante_db OWNER kirasante_user;
‎GRANT ALL PRIVILEGES ON DATABASE kirasante_db TO kirasante_user;
‎
‎6. Exécuter les migrations
‎node migrations/run.js
‎
‎7. Démarrer le serveur
‎node src/server.js
‎
‎8. Vérifier
‎curl http://localhost:3000/health
‎
‎---
‎
‎Documentation API interactive
‎http://localhost:3000/api/v1/docs
‎
‎---
‎
‎Endpoints principaux
‎
‎Authentification
‎POST   /api/v1/auth/register                   — Créer un compte
‎POST   /api/v1/auth/login                      — Se connecter
‎POST   /api/v1/auth/logout                     — Se déconnecter (blacklist token)
‎POST   /api/v1/auth/refresh                    — Renouveler le token
‎GET    /api/v1/auth/me                         — Mon profil
‎PUT    /api/v1/auth/changer-mot-de-passe       — Changer mot de passe
‎PUT    /api/v1/auth/profil                     — Modifier profil
‎POST   /api/v1/auth/mot-de-passe-oublie        — Demander OTP SMS
‎POST   /api/v1/auth/verifier-otp               — Vérifier OTP
‎POST   /api/v1/auth/reinitialiser-mot-de-passe — Réinitialiser mot de passe
‎
‎Patients
‎POST   /api/v1/patients              — Créer patient
‎GET    /api/v1/patients              — Lister patients
‎GET    /api/v1/patients/:id          — Détail patient
‎GET    /api/v1/patients/qr/:code     — Patient par QR code
‎PUT    /api/v1/patients/:id          — Modifier patient
‎
‎Dossier médical
‎GET    /api/v1/dossier/patient/:id   — Dossier complet
‎GET    /api/v1/dossier/qr/:code      — Dossier par QR code
‎
‎Consultations
‎POST   /api/v1/consultations                    — Créer consultation
‎GET    /api/v1/consultations/patient/:id        — Historique patient
‎
‎Vaccinations
‎POST   /api/v1/vaccinations                     — Enregistrer vaccin
‎GET    /api/v1/vaccinations/patient/:id         — Carnet vaccinal
‎
‎Traduction multilingue
‎GET    /api/v1/traduction/traduire?terme=X&langue=moore  — Traduire terme
‎GET    /api/v1/traduction/rechercher?terme=X             — Recherche floue
‎POST   /api/v1/traduction/ordonnance                     — Traduire ordonnance
‎GET    /api/v1/traduction/termes                         — Dictionnaire complet
‎
‎Alertes sanitaires
‎GET    /api/v1/alertes               — Lister alertes
‎GET    /api/v1/alertes/actives       — Alertes actives
‎PUT    /api/v1/alertes/:id/resoudre  — Résoudre alerte
‎
‎Dashboard
‎GET    /api/v1/dashboard/stats       — Statistiques globales
‎GET    /api/v1/dashboard/districts   — Stats par district
‎GET    /api/v1/dashboard/evolution   — Évolution consultations
‎GET    /api/v1/dashboard/symptomes   — Top symptômes
‎GET    /api/v1/dashboard/rappels     — Rappels vaccinaux
‎
‎Districts
‎GET    /api/v1/districts             — Lister districts
‎POST   /api/v1/districts             — Créer district (admin)
‎PUT    /api/v1/districts/:id         — Modifier district (admin)
‎
‎Rappels SMS
‎POST   /api/v1/rappels               — Programmer rappel
‎GET    /api/v1/rappels               — Lister rappels
‎DELETE /api/v1/rappels/:id           — Annuler rappel
‎
‎Export
‎GET    /api/v1/export/pdf/patient/:id — Carnet santé PDF
‎GET    /api/v1/export/csv/patients    — Export CSV patients (admin)
‎POST   /api/v1/export/csv/import      — Import CSV patients (admin)
‎
‎Recherche avancée
‎GET    /api/v1/recherche/patients             — Recherche full-text patients
‎GET    /api/v1/recherche/consultations        — Recherche consultations
‎GET    /api/v1/recherche/patients/tel/:phone  — Recherche par téléphone
‎
‎Autres
‎GET    /api/v1/dhis2/export          — Export données DHIS2 (admin)
‎POST   /api/v1/sync                  — Synchronisation offline
‎POST   /api/v1/ussd/webhook          — Webhook USSD
‎POST   /api/v1/notifications/fcm-token — Enregistrer token FCM
‎GET    /health                       — Health check système
‎
‎---
‎
‎Langues supportées
‎Français (fr)
‎Mooré (moore)
‎Dioula (dioula)
‎Fulfuldé (fulfulde)
‎
‎---
‎
‎Sécurité
‎JWT avec blacklist à la déconnexion
‎OTP SMS pour réinitialisation mot de passe
‎Détection et blocage des intrusions (IP + téléphone)
‎Chiffrement AES-256 des données sensibles
‎Rate limiting par route
‎Sanitisation XSS et HPP
‎Timeout requêtes 30 secondes
‎Circuit breaker PostgreSQL
‎Backup automatique quotidien
‎
‎---
‎
‎Architecture
‎src/
‎├── config/          — Base de données, Swagger, environnement
‎├── controllers/     — Logique métier de chaque route
‎├── middlewares/     — Auth, rôles, cache, validation, audit
‎├── models/          — Requêtes SQL par entité
‎├── routes/          — Définition des endpoints
‎├── services/
‎│   ├── alertes/     — Détection clusters épidémiques
‎│   ├── auth/        — Blacklist JWT
‎│   ├── backup/      — Sauvegarde automatique
‎│   ├── cache/       — Cache mémoire
‎│   ├── database/    — Circuit breaker
‎│   ├── export/      — PDF et CSV
‎│   ├── notifications/ — FCM push
‎│   ├── security/    — Détection intrusion
‎│   ├── sms/         — Africa's Talking
‎│   ├── sync/        — Synchronisation offline
‎│   ├── traduction/  — Dictionnaire médical
‎│   └── versioning/  — Historique dossiers
‎├── utils/           — Logger, réponses, pagination, QR code
‎└── validators/      — Schemas Joi
‎
‎---
‎
‎Variables d'environnement requises
‎PORT, NODE_ENV
‎DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
‎JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
‎ENCRYPTION_KEY
‎AT_API_KEY, AT_USERNAME, AT_SENDER_ID
‎FCM_SERVER_KEY
‎CLUSTER_RADIUS_KM, CLUSTER_MIN_CASES, CLUSTER_TIME_HOURS
‎EOF
cat > src/controllers/export.controller.js << 'EOF'
const { genererCarnetSante } = require('../services/export/pdf.service');
const { exporterPatients, importerPatients } = require('../services/export/csv.service');
const { query } = require('../config/database');
const Patient = require('../models/patient.model');
const { generateUniqueCode } = require('../utils/qrcode.utils');
const { success, notFound, badRequest, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const exporterPDF = async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findById(id);
    if (!patient) return notFound(res, 'Patient introuvable');

    const [consultations, vaccinations] = await Promise.all([
      query('SELECT * FROM consultations WHERE patient_id=$1 ORDER BY date_consultation DESC', [id]),
      query('SELECT * FROM vaccinations WHERE patient_id=$1 ORDER BY date_admin DESC', [id])
    ]);

    const prochain_vaccin = await query(
      'SELECT vaccin_nom, prochain_rappel FROM vaccinations WHERE patient_id=$1 AND prochain_rappel >= CURRENT_DATE ORDER BY prochain_rappel ASC LIMIT 1',
      [id]
    );

    const dossier = {
      patient,
      resume: {
        total_consultations: consultations.rows.length,
        total_vaccinations:  vaccinations.rows.length,
        derniere_consultation: consultations.rows[0]?.date_consultation || null,
        prochain_vaccin:     prochain_vaccin.rows[0] || null
      },
      consultations: consultations.rows,
      vaccinations:  vaccinations.rows
    };

    genererCarnetSante(dossier, res);
  } catch (err) {
    logger.error('Erreur export PDF', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const exporterCSV = async (req, res) => {
  try {
    const { district_id } = req.query;
    const conditions = district_id ? 'WHERE district_id=$1 AND deleted_at IS NULL' : 'WHERE deleted_at IS NULL';
    const params = district_id ? [district_id] : [];
    const result = await query(`SELECT * FROM patients ${conditions} ORDER BY created_at DESC`, params);
    exporterPatients(result.rows, res);
  } catch (err) {
    logger.error('Erreur export CSV', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const importerCSV = async (req, res) => {
  try {
    if (!req.file) return badRequest(res, 'Fichier CSV requis');
    const contenu = req.file.buffer.toString('utf-8');
    const { patients, erreurs } = await importerPatients(contenu);

    if (patients.length === 0) {
      return badRequest(res, 'Aucun patient valide dans le fichier', erreurs);
    }

    const importes = [];
    for (const p of patients) {
      try {
        const qr_code = generateUniqueCode();
        const result = await query(
          `INSERT INTO patients (qr_code, nom, prenom, date_naissance, sexe, groupe_sanguin, telephone, langue, agent_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id, qr_code, nom, prenom`,
          [qr_code, p.nom, p.prenom, p.date_naissance, p.sexe, p.groupe_sanguin, p.telephone, p.langue, req.user.id]
        );
        importes.push(result.rows[0]);
      } catch (e) {
        erreurs.push({ patient: `${p.nom} ${p.prenom}`, erreur: e.message });
      }
    }

    logger.success(`Import CSV : ${importes.length} patients importés`);
    return success(res, {
      importes: importes.length,
      erreurs: erreurs.length,
      details_erreurs: erreurs
    }, `${importes.length} patients importés avec succès`);
  } catch (err) {
    logger.error('Erreur import CSV', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { exporterPDF, exporterCSV, importerCSV };
