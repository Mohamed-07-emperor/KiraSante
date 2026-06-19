const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KiraSante BF API',
      version: '1.0.0',
      description: 'Système Intelligent de Suivi Sanitaire Multilingue et Hors Ligne — Burkina Faso',
      contact: { name: 'Équipe KIRA', email: 'lleritiersanon@gmail.com' }
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Développement' },
      { url: 'https://kirasante.bf', description: 'Production' }
    ],
    components: {
      securitySchemes: {
        BearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Patient: {
          type: 'object',
          properties: {
            id:             { type: 'string', format: 'uuid' },
            qr_code:        { type: 'string', example: 'KIRA-D787C164A603' },
            nom:            { type: 'string', example: 'OUEDRAOGO' },
            prenom:         { type: 'string', example: 'Aminata' },
            date_naissance: { type: 'string', format: 'date', example: '1990-05-15' },
            sexe:           { type: 'string', enum: ['M','F'] },
            groupe_sanguin: { type: 'string', enum: ['A+','A-','B+','B-','AB+','AB-','O+','O-'] },
            telephone:      { type: 'string', example: '+22670111222' },
            langue:         { type: 'string', enum: ['moore','dioula','fulfulde','fr'] }
          }
        },
        Consultation: {
          type: 'object',
          properties: {
            id:               { type: 'string', format: 'uuid' },
            patient_id:       { type: 'string', format: 'uuid' },
            motif:            { type: 'string', example: 'Fièvre et maux de tête' },
            diagnostic:       { type: 'string', example: 'Paludisme simple' },
            traitement:       { type: 'string', example: 'Artémether 80mg' },
            symptomes:        { type: 'array', items: { type: 'string' } },
            date_consultation:{ type: 'string', format: 'date-time' }
          }
        },
        Agent: {
          type: 'object',
          properties: {
            id:         { type: 'string', format: 'uuid' },
            nom:        { type: 'string' },
            prenom:     { type: 'string' },
            telephone:  { type: 'string' },
            role:       { type: 'string', enum: ['patient','agent','admin'] },
            district_id:{ type: 'string', format: 'uuid' }
          }
        },
        Success: {
          type: 'object',
          properties: {
            success:   { type: 'boolean', example: true },
            message:   { type: 'string' },
            data:      { type: 'object' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    security: [{ BearerAuth: [] }],
    tags: [
      { name: 'Auth',          description: 'Authentification et gestion des comptes' },
      { name: 'Patients',      description: 'Gestion des patients' },
      { name: 'Consultations', description: 'Consultations médicales' },
      { name: 'Vaccinations',  description: 'Suivi vaccinal' },
      { name: 'Traduction',    description: 'Traduction médicale multilingue' },
      { name: 'Alertes',       description: 'Alertes sanitaires' },
      { name: 'Dashboard',     description: 'Statistiques et tableau de bord' },
      { name: 'Districts',     description: 'Gestion des districts' },
      { name: 'Export',        description: 'Export PDF et CSV' },
      { name: 'Rappels',       description: 'Rappels SMS' },
      { name: 'DHIS2',         description: 'Interopérabilité DHIS2' },
      { name: 'System',        description: 'Santé et monitoring du système' }
    ]
  },
  apis: ['./src/routes/*.js']
};

module.exports = swaggerJsdoc(options);
