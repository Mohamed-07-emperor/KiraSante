# KiraSante BF — API Backend v1.0.0

Système intelligent de suivi sanitaire multilingue et hors ligne — Burkina Faso.
Equipe KIRA : SANON Mohamed · DRABO Faïssale · TAMBOURA Evelyne

## Démarrage
npm install && cp .env.example .env && node migrations/run.js && node src/server.js

## Endpoints principaux
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/mot-de-passe-oublie
- POST /api/v1/auth/verifier-otp
- POST /api/v1/auth/reinitialiser-mot-de-passe
- GET/POST /api/v1/patients
- GET /api/v1/dossier/patient/:id
- POST /api/v1/consultations
- POST /api/v1/vaccinations
- GET /api/v1/traduction/traduire?terme=X&langue=moore
- GET /api/v1/dashboard/stats
- POST /api/v1/rappels
- GET /api/v1/alertes
- GET /api/v1/dhis2/export
- POST /api/v1/sync
