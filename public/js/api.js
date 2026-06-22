const API_BASE = '/api/v1';
let _token = null;
let _utilisateur = null;

const Api = {
  setToken(token) {
    _token = token;
    sessionStorage.setItem('ks_token', token);
  },
  getToken() {
    if (_token) return _token;
    _token = sessionStorage.getItem('ks_token');
    return _token;
  },
  clearToken() {
    _token = null;
    _utilisateur = null;
    sessionStorage.removeItem('ks_token');
    sessionStorage.removeItem('ks_user');
  },
  setUtilisateur(user) {
    _utilisateur = user;
    sessionStorage.setItem('ks_user', JSON.stringify(user));
  },
  getUtilisateur() {
    if (_utilisateur) return _utilisateur;
    try {
      const raw = sessionStorage.getItem('ks_user');
      _utilisateur = raw ? JSON.parse(raw) : null;
    } catch { _utilisateur = null; }
    return _utilisateur;
  },
  estConnecte() {
    return !!this.getToken();
  },
  async requete(methode, endpoint, corps = null) {
    const options = {
      method: methode,
      headers: { 'Content-Type': 'application/json' }
    };
    const token = this.getToken();
    if (token) options.headers['Authorization'] = `Bearer ${token}`;
    if (corps)  options.body = JSON.stringify(corps);
    try {
      const reponse = await fetch(`${API_BASE}${endpoint}`, options);
      const donnees = await reponse.json();
      if (!reponse.ok) throw new ErreurApi(donnees.message || 'Erreur serveur', reponse.status, donnees);
      return donnees;
    } catch (err) {
      if (err instanceof ErreurApi) throw err;
      throw new ErreurApi('Pas de connexion internet', 0, { offline: true });
    }
  },
  async connexion(telephone, mot_de_passe) {
    const data = await this.requete('POST', '/auth/login', { telephone, mot_de_passe });
    const token = data.data?.token || data.token;
    const agent = data.data?.agent || data.utilisateur || data.user;
    if (token) { this.setToken(token); this.setUtilisateur(agent); }
    return data;
  },
  async inscription(donnees) {
    const data = await this.requete('POST', '/auth/register', donnees);
    const token = data.data?.token || data.token;
    const agent = data.data?.agent || data.utilisateur || data.user;
    if (token) { this.setToken(token); this.setUtilisateur(agent); }
    return data;
  },
  async deconnexion() {
    try { await this.requete('POST', '/auth/logout'); } finally { this.clearToken(); }
  },
  async profil() { return this.requete('GET', '/auth/me'); },
  async mesPatients(page = 1, limite = 20) {
    return this.requete('GET', `/patients?page=${page}&limite=${limite}`);
  },
  async patient(id) { return this.requete('GET', `/patients/${id}`); },
  async ajouterMesure(patientId, mesure) {
    return this.requete('POST', `/patients/${patientId}/mesures`, mesure);
  },
  async mesures(patientId) { return this.requete('GET', `/patients/${patientId}/mesures`); },
};

class ErreurApi extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ErreurApi';
    this.status = status;
    this.data = data;
    this.estOffline = data?.offline === true;
  }
}

window.Api = Api;
window.ErreurApi = ErreurApi;
