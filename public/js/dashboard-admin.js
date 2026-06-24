if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

// ---- DATE ----
function afficherDate() {
  const el = document.getElementById('admin-date');
  if (!el) return;
  const now = new Date();
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  el.textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
}

// ---- NAVIGATION ----
let carteInit = false;
let mapInstance = null;

window.allerPage = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('actif'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('actif');
  if (page === 'carte' && !carteInit) { initCarte(); carteInit = true; }
  if (page === 'alertes') chargerAlertes();
  if (page === 'export') chargerEvolution();
};

// ---- LOADING ----
function afficherLoading(msg) {
  const o = document.getElementById('loading-overlay');
  const t = document.getElementById('loading-texte');
  if (o) o.classList.add('visible');
  if (t) t.textContent = msg || 'Chargement…';
}
function cacherLoading() {
  const o = document.getElementById('loading-overlay');
  if (o) o.classList.remove('visible');
}

// ---- STATS GLOBALES ----
async function chargerStats() {
  try {
    const data = await Api.requete('GET', '/dashboard/stats');
    const s = data.data || {};
    const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val ?? '0'; };
    set('g-patients',      s.patients);
    set('g-consultations', s.consultations);
    set('g-agents',        s.agents_actifs);
    set('g-alertes',       s.alertes_actives);
    set('t-consultations', s.consultations_aujourd_hui);
    set('t-patients',      s.nouveaux_patients_semaine);
    set('t-vaccinations',  s.vaccinations);
  } catch(e) { console.error('Stats:', e); }
}

// ---- TOP SYMPTOMES ----
async function chargerSymptomes() {
  const liste = document.getElementById('liste-symptomes');
  if (!liste) return;
  try {
    const data = await Api.requete('GET', '/dashboard/symptomes');
    const symptomes = data.data?.symptomes || [];
    if (!symptomes.length) {
      liste.innerHTML = '<div class="etat-vide"><span>Aucun symptôme enregistré ce mois</span></div>';
      return;
    }
    const max = Math.max(...symptomes.map(s => parseInt(s.occurrences)));
    liste.innerHTML = symptomes.map(s => {
      const pct = Math.round((parseInt(s.occurrences) / max) * 100);
      return `<div class="symptome-item">
        <span class="symptome-nom">${s.symptome}</span>
        <div class="symptome-barre-container">
          <div class="symptome-barre" style="width:${pct}%"></div>
        </div>
        <span class="symptome-count">${s.occurrences}</span>
      </div>`;
    }).join('');
  } catch(e) {
    liste.innerHTML = '<div class="etat-vide"><span>Erreur de chargement</span></div>';
  }
}

// ---- RAPPELS ----
async function chargerRappels() {
  const liste = document.getElementById('liste-rappels');
  const badge = document.getElementById('badge-rappels');
  if (!liste) return;
  try {
    const data = await Api.requete('GET', '/dashboard/rappels');
    const rappels = data.data?.rappels || [];
    if (badge) badge.textContent = rappels.length;
    if (!rappels.length) {
      liste.innerHTML = '<div class="etat-vide"><span>Aucun rappel cette semaine</span></div>';
      return;
    }
    liste.innerHTML = rappels.map(r => {
      const date = r.prochain_rappel ? new Date(r.prochain_rappel).toLocaleDateString('fr-FR') : '—';
      const diff = r.prochain_rappel ? Math.ceil((new Date(r.prochain_rappel)-new Date())/(1000*60*60*24)) : 999;
      const statut = diff <= 2 ? 'urgent' : 'normal';
      const label = diff < 0 ? 'En retard' : diff === 0 ? "Aujourd'hui" : `Dans ${diff}j`;
      return `<div class="rappel-item">
        <div class="rappel-info">
          <div class="rappel-nom">${r.vaccin_nom} · ${r.prenom} ${r.nom}</div>
          <div class="rappel-date">${date} · ${r.telephone||'—'} · ${r.district_nom||'—'}</div>
        </div>
        <span class="rappel-statut ${statut}">${label}</span>
      </div>`;
    }).join('');
  } catch(e) {
    liste.innerHTML = '<div class="etat-vide"><span>Erreur de chargement</span></div>';
  }
}

// ---- CARTE LEAFLET ----
async function initCarte() {
  if (mapInstance) return;
  try {
    mapInstance = L.map('map').setView([12.3667, -1.5333], 7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18
    }).addTo(mapInstance);

    const data = await Api.requete('GET', '/dashboard/districts');
    const districts = data.data?.districts || [];
    afficherDistricts(districts);

    districts.forEach(d => {
      if (d.latitude && d.longitude) {
        const couleur = parseInt(d.alertes_actives) > 0 ? '#D94F4F' : '#0F6E5C';
        const marker = L.circleMarker([d.latitude, d.longitude], {
          radius: 8 + parseInt(d.total_patients || 0) / 10,
          fillColor: couleur,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        }).addTo(mapInstance);
        marker.bindPopup(`
          <strong>${d.nom}</strong><br>
          ${d.total_patients} patients · ${d.total_consultations} consultations<br>
          ${parseInt(d.alertes_actives) > 0 ? `<span style="color:#D94F4F">⚠️ ${d.alertes_actives} alerte(s)</span>` : '✅ Aucune alerte'}
        `);
      }
    });

    // Marqueur Ouagadougou par défaut
    L.marker([12.3667, -1.5333])
      .addTo(mapInstance)
      .bindPopup('<strong>District de Ouagadougou</strong><br>Zone principale')
      .openPopup();

  } catch(e) {
    console.error('Carte:', e);
  }
}

function afficherDistricts(districts) {
  const liste = document.getElementById('liste-districts');
  if (!liste) return;
  if (!districts.length) {
    liste.innerHTML = '<div class="etat-vide"><span>Aucun district</span></div>';
    return;
  }
  liste.innerHTML = districts.map(d => `
    <div class="district-item">
      <div class="district-icone">🏥</div>
      <div class="district-info">
        <div class="district-nom">${d.nom}</div>
        <div class="district-stats">${d.total_patients} patients · ${d.total_consultations} consultations</div>
      </div>
      ${parseInt(d.alertes_actives) > 0
        ? `<span class="district-alertes">⚠️ ${d.alertes_actives}</span>`
        : '<span style="color:var(--vert-clinique);font-size:var(--text-xs)">✅</span>'}
    </div>`).join('');
}

// ---- ALERTES ----
async function chargerAlertes() {
  const liste = document.getElementById('liste-alertes-admin');
  if (!liste) return;
  try {
    const data = await Api.requete('GET', '/alertes');
    const alertes = data.data?.alertes || [];
    if (!alertes.length) {
      liste.innerHTML = '<div class="etat-vide"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><span>Aucune alerte active</span></div>';
      return;
    }
    liste.innerHTML = alertes.map(a => `
      <div class="alerte-admin-item" id="alerte-${a.id}">
        <div class="alerte-admin-titre">⚠️ ${a.type_alerte || 'Alerte sanitaire'}</div>
        <div class="alerte-admin-details">
          ${a.nombre_cas ? `${a.nombre_cas} cas · ` : ''}
          ${a.description || ''}<br>
          Détectée le ${new Date(a.date_detection||a.created_at).toLocaleDateString('fr-FR')}
        </div>
        <div class="alerte-admin-footer">
          <span class="alerte-statut ${a.statut||'active'}">${a.statut==='resolue'?'Résolue':'Active'}</span>
          ${a.statut !== 'resolue'
            ? `<button class="btn-resoudre" onclick="resoudreAlerte('${a.id}')">Marquer résolue</button>`
            : ''}
        </div>
      </div>`).join('');
  } catch(e) {
    liste.innerHTML = '<div class="etat-vide"><span>Erreur de chargement</span></div>';
  }
}

window.resoudreAlerte = async function(id) {
  try {
    await Api.requete('PUT', `/alertes/${id}/resoudre`);
    chargerAlertes();
  } catch(e) {
    alert('Erreur : ' + e.message);
  }
};

// ---- EVOLUTION CONSULTATIONS ----
async function chargerEvolution() {
  const chart = document.getElementById('evolution-chart');
  if (!chart) return;
  try {
    const data = await Api.requete('GET', '/dashboard/evolution?jours=30');
    const evolution = data.data?.evolution || [];
    if (!evolution.length) {
      chart.innerHTML = '<div class="etat-vide"><span>Aucune donnée</span></div>';
      return;
    }
    const max = Math.max(...evolution.map(e => parseInt(e.total)));
    chart.innerHTML = evolution.map(e => {
      const h = max > 0 ? Math.max(4, Math.round((parseInt(e.total) / max) * 180)) : 4;
      const date = new Date(e.jour).toLocaleDateString('fr-FR', { day:'2-digit', month:'2-digit' });
      return `<div class="chart-bar" style="height:${h}px" title="${date}: ${e.total} consultation(s)"></div>`;
    }).join('');
  } catch(e) {
    chart.innerHTML = '<div class="etat-vide"><span>Erreur</span></div>';
  }
}

// ---- EXPORT DHIS2 ----
window.exporterDHIS2 = async function() {
  const debut = document.getElementById('export-debut').value;
  const fin   = document.getElementById('export-fin').value;
  const alerte = document.getElementById('alerte-export');
  afficherLoading('Export DHIS2 en cours…');
  try {
    let url = '/dhis2/export';
    const params = [];
    if (debut) params.push(`date_debut=${debut}`);
    if (fin)   params.push(`date_fin=${fin}`);
    if (params.length) url += '?' + params.join('&');
    const data = await Api.requete('GET', url);
    cacherLoading();
    const json = JSON.stringify(data.data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kirasante-dhis2-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    if (alerte) { alerte.textContent = `✅ Export réussi — ${data.data?.totalPatients||0} patients, ${data.data?.totalConsultations||0} consultations`; alerte.className = 'alerte visible succes'; }
  } catch(e) {
    cacherLoading();
    if (alerte) { alerte.textContent = 'Erreur export : ' + e.message; alerte.className = 'alerte visible erreur'; }
  }
};

window.exporterCSV = async function() {
  afficherLoading('Génération CSV…');
  try {
    const data = await Api.requete('GET', '/export/csv');
    cacherLoading();
    const blob = new Blob([data], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kirasante-patients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  } catch(e) {
    cacherLoading();
    alert('Export CSV : ' + e.message);
  }
};

// ---- DÉCONNEXION ----
document.getElementById('btn-deconnexion')?.addEventListener('click', async () => {
  if (!confirm('Se déconnecter ?')) return;
  await Api.deconnexion();
  window.location.href = '/';
});

// ---- INIT ----
async function init() {
  const user = Api.getUtilisateur();
  if (!user) { window.location.href = '/'; return; }
  const nomEl = document.getElementById('admin-nom');
  if (nomEl) nomEl.textContent = `Bonjour, ${user.prenom || 'Admin'}`;
  afficherDate();
  await Promise.allSettled([
    chargerStats(),
    chargerSymptomes(),
    chargerRappels()
  ]);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!Api.estConnecte()) { window.location.href = '/'; return; }
  init();
});
