/* ============================================
   KIRASANTE BF — OFFLINE SYNC (IndexedDB)
   Stockage local + synchronisation différée
   ============================================ */

const DB_NAME = 'KiraSanteDB';
const DB_VERSION = 1;
let db = null;

const OfflineSync = {

  async init() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        // Store patients local
        if (!db.objectStoreNames.contains('patients')) {
          const ps = db.createObjectStore('patients', { keyPath: 'id' });
          ps.createIndex('nom', 'nom', { unique: false });
          ps.createIndex('sync_status', 'sync_status', { unique: false });
        }
        // Store consultations local
        if (!db.objectStoreNames.contains('consultations')) {
          const cs = db.createObjectStore('consultations', { keyPath: 'id' });
          cs.createIndex('patient_id', 'patient_id', { unique: false });
          cs.createIndex('sync_status', 'sync_status', { unique: false });
        }
        // Store vaccinations local
        if (!db.objectStoreNames.contains('vaccinations')) {
          const vs = db.createObjectStore('vaccinations', { keyPath: 'id' });
          vs.createIndex('patient_id', 'patient_id', { unique: false });
        }
        // File de synchronisation
        if (!db.objectStoreNames.contains('sync_queue')) {
          const sq = db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
          sq.createIndex('statut', 'statut', { unique: false });
          sq.createIndex('table_cible', 'table_cible', { unique: false });
        }
        // Cache traductions
        if (!db.objectStoreNames.contains('traductions')) {
          db.createObjectStore('traductions', { keyPath: 'cle' });
        }
      };
      req.onsuccess = (e) => { db = e.target.result; resolve(db); };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async sauvegarderPatient(patient) {
    if (!db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readwrite');
      const store = tx.objectStore('patients');
      const data = { ...patient, sync_status: 'synced', updated_local: new Date().toISOString() };
      const req = store.put(data);
      req.onsuccess = () => resolve(data);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async obtenirPatientsLocaux() {
    if (!db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('patients', 'readonly');
      const store = tx.objectStore('patients');
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async sauvegarderConsultation(consultation) {
    if (!db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['consultations', 'sync_queue'], 'readwrite');
      const store = tx.objectStore('consultations');
      const queue = tx.objectStore('sync_queue');
      const id = consultation.id || `local_${Date.now()}_${Math.random().toString(36).substr(2,9)}`;
      const data = { ...consultation, id, sync_status: 'pending', created_local: new Date().toISOString() };
      store.put(data);
      if (!navigator.onLine) {
        queue.add({
          table_cible: 'consultations',
          operation: consultation.id ? 'UPDATE' : 'INSERT',
          payload: data,
          record_id: id,
          statut: 'pending',
          created_at: new Date().toISOString()
        });
      }
      tx.oncomplete = () => resolve(data);
      tx.onerror = (e) => reject(e.target.error);
    });
  },

  async ajouterALaQueue(table_cible, operation, payload, record_id) {
    if (!db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.add({
        table_cible, operation, payload, record_id,
        statut: 'pending',
        created_at: new Date().toISOString()
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async obtenirQueuePending() {
    if (!db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readonly');
      const store = tx.objectStore('sync_queue');
      const index = store.index('statut');
      const req = index.getAll('pending');
      req.onsuccess = () => resolve(req.result);
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async marquerSynced(id) {
    if (!db) await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result;
        if (item) { item.statut = 'synced'; store.put(item); }
        resolve();
      };
      req.onerror = (e) => reject(e.target.error);
    });
  },

  async synchroniser() {
    if (!navigator.onLine) return { success: false, message: 'Hors ligne' };
    try {
      const pending = await this.obtenirQueuePending();
      if (!pending.length) return { success: true, synced: 0 };
      const donnees = pending.map(item => ({
        table_cible: item.table_cible,
        operation: item.operation,
        payload: item.payload,
        record_id: item.record_id
      }));
      const result = await Api.requete('POST', '/sync', { donnees });
      for (const item of pending) {
        await this.marquerSynced(item.id);
      }
      console.log(`[KiraSante] Sync: ${pending.length} enregistrements synchronisés`);
      return { success: true, synced: pending.length, resultats: result.data?.resultats };
    } catch(e) {
      console.error('[KiraSante] Erreur sync:', e);
      return { success: false, error: e.message };
    }
  },

  async cachePatientsDepuisAPI() {
    try {
      const data = await Api.requete('GET', '/patients');
      const patients = data.data?.patients || [];
      for (const p of patients) {
        await this.sauvegarderPatient(p);
      }
      console.log(`[KiraSante] ${patients.length} patients mis en cache local`);
      return patients.length;
    } catch(e) {
      console.warn('[KiraSante] Cache patients échoué:', e.message);
      return 0;
    }
  },

  async obtenirStatutQueue() {
    const pending = await this.obtenirQueuePending();
    return { pending: pending.length };
  }
};

// Auto-sync quand connexion rétablie
window.addEventListener('online', async () => {
  console.log('[KiraSante] Connexion rétablie — synchronisation…');
  if (typeof Api !== 'undefined' && Api.estConnecte()) {
    const result = await OfflineSync.synchroniser();
    if (result.synced > 0) {
      console.log(`[KiraSante] ${result.synced} éléments synchronisés`);
    }
  }
});

window.OfflineSync = OfflineSync;

// Init au chargement
document.addEventListener('DOMContentLoaded', async () => {
  await OfflineSync.init();
  console.log('[KiraSante] IndexedDB initialisé');
});
