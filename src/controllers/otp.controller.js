const { query } = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { success, badRequest, unauthorized, error } = require('../utils/response.utils');
const logger = require('../utils/logger');

const genererCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const envoyerSMS = async (telephone, code, type) => {
  const messages = {
    inscription: `KiraSante BF : Votre code de verification est ${code}. Valable 10 minutes.`,
    reinitialisation: `KiraSante BF : Votre code de reinitialisation est ${code}. Valable 10 minutes.`
  };
  const message = messages[type] || messages.inscription;
  logger.info(`[SMS SANDBOX] ${telephone} : ${message}`);
  return { sandbox: true, code };
};

const envoyerOTP = async (req, res) => {
  try {
    const { telephone, type = 'inscription' } = req.body;
    if (!telephone) return badRequest(res, 'Numero de telephone requis');
    const tentatives = await query(
      `SELECT COUNT(*) FROM otp_codes WHERE telephone=$1 AND created_at > NOW() - INTERVAL '10 minutes'`,
      [telephone]
    );
    if (parseInt(tentatives.rows[0].count) >= 3)
      return badRequest(res, 'Trop de tentatives. Reessayez dans 10 minutes.');
    await query(`UPDATE otp_codes SET utilise=true WHERE telephone=$1 AND utilise=false`, [telephone]);
    const code = genererCode();
    const expire_at = new Date(Date.now() + 10 * 60 * 1000);
    await query(
      `INSERT INTO otp_codes (telephone, code, type, expire_at) VALUES ($1, $2, $3, $4)`,
      [telephone, code, type, expire_at]
    );
    const smsResult = await envoyerSMS(telephone, code, type);
    logger.success(`OTP envoye a ${telephone}`);
    const reponse = { message: 'Code envoye' };
    if (smsResult.sandbox) reponse.code_demo = code;
    return success(res, reponse, 'Code OTP envoye');
  } catch(err) {
    logger.error('Erreur envoi OTP', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const verifierInscription = async (req, res) => {
  try {
    const { telephone, code, nom, prenom, mot_de_passe, sexe, date_naissance } = req.body;
    if (!telephone || !code || !nom || !prenom || !mot_de_passe)
      return badRequest(res, 'Tous les champs sont requis');
    const otpRes = await query(
      `SELECT * FROM otp_codes WHERE telephone=$1 AND code=$2 AND type='inscription' AND utilise=false AND expire_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [telephone, code]
    );
    if (!otpRes.rows.length) return unauthorized(res, 'Code invalide ou expire');
    await query(`UPDATE otp_codes SET utilise=true WHERE id=$1`, [otpRes.rows[0].id]);
    const existant = await query('SELECT id FROM patients WHERE telephone=$1', [telephone]);
    if (existant.rows.length) return badRequest(res, 'Ce numero est deja enregistre');
    const hash = await bcrypt.hash(mot_de_passe, 12);
    const qr_code = `KIRA-PAT-${Date.now()}-${Math.random().toString(36).substr(2,6).toUpperCase()}`;
    const patientRes = await query(
      `INSERT INTO patients (nom, prenom, telephone, mot_de_passe, qr_code, langue, sexe, date_naissance)
       VALUES ($1, $2, $3, $4, $5, 'fr', $6, $7) RETURNING id, nom, prenom, telephone, qr_code`,
      [nom.toUpperCase(), prenom, telephone, hash, qr_code, sexe || 'M', date_naissance || '2000-01-01']
    );
    const patient = patientRes.rows[0];
    const token = jwt.sign(
      { id: patient.id, role: 'patient', type: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    logger.success(`Patient inscrit : ${prenom} ${nom} (${telephone})`);
    return success(res, { patient, token }, 'Inscription reussie');
  } catch(err) {
    logger.error('Erreur verification OTP', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const loginPatient = async (req, res) => {
  try {
    const { telephone, mot_de_passe } = req.body;
    if (!telephone || !mot_de_passe) return badRequest(res, 'Telephone et mot de passe requis');
    const patientRes = await query('SELECT * FROM patients WHERE telephone=$1 AND deleted_at IS NULL', [telephone]);
    if (!patientRes.rows.length) return unauthorized(res, 'Numero non enregistre');
    const patient = patientRes.rows[0];
    if (!patient.mot_de_passe) return unauthorized(res, 'Compte non active');
    const valide = await bcrypt.compare(mot_de_passe, patient.mot_de_passe);
    if (!valide) return unauthorized(res, 'Mot de passe incorrect');
    const token = jwt.sign(
      { id: patient.id, role: 'patient', type: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    logger.success(`Patient connecte : ${patient.telephone}`);
    return success(res, { patient, token }, 'Connexion reussie');
  } catch(err) {
    logger.error('Erreur login patient', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

const reinitialiserMotDePasse = async (req, res) => {
  try {
    const { telephone, code, nouveau_mot_de_passe } = req.body;
    if (!telephone || !code || !nouveau_mot_de_passe)
      return badRequest(res, 'Tous les champs sont requis');
    const otpRes = await query(
      `SELECT * FROM otp_codes WHERE telephone=$1 AND code=$2 AND type='reinitialisation' AND utilise=false AND expire_at > NOW() ORDER BY created_at DESC LIMIT 1`,
      [telephone, code]
    );
    if (!otpRes.rows.length) return unauthorized(res, 'Code invalide ou expire');
    await query(`UPDATE otp_codes SET utilise=true WHERE id=$1`, [otpRes.rows[0].id]);
    const hash = await bcrypt.hash(nouveau_mot_de_passe, 12);
    const r = await query(
      `UPDATE patients SET mot_de_passe=$1, updated_at=NOW() WHERE telephone=$2 RETURNING id`,
      [hash, telephone]
    );
    if (!r.rows.length) return badRequest(res, 'Numero non enregistre');
    logger.success(`Mot de passe reinitialise : ${telephone}`);
    return success(res, {}, 'Mot de passe reinitialise avec succes');
  } catch(err) {
    logger.error('Erreur reinitialisation', err);
    return error(res, 'Erreur serveur', 500, err.message);
  }
};

module.exports = { envoyerOTP, verifierInscription, loginPatient, reinitialiserMotDePasse };
