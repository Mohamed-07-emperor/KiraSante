if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

// ---- ECG ----
(function() {
  const canvas = document.getElementById('ecg-header');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let phase = 0;
  function valeurECG(t) {
    const c = t % 1;
    if (c < 0.3)  return Math.sin(c * Math.PI * 2) * 0.15;
    if (c < 0.4)  return -0.1;
    if (c < 0.42) return -0.3;
    if (c < 0.45) return 1.0;
    if (c < 0.48) return -0.25;
    if (c < 0.6)  return Math.sin((c-0.48)*Math.PI/0.12)*0.2;
    return 0;
  }
  function draw() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.beginPath();
    ctx.strokeStyle='rgba(255,255,255,0.18)';
    ctx.lineWidth=1.5;
    for (let i=0;i<canvas.width;i++) {
      const y = canvas.height/2 - valeurECG((i/canvas.width)*2+phase)*(canvas.height*0.4);
      i===0 ? ctx.moveTo(i,y) : ctx.lineTo(i,y);
    }
    ctx.stroke();
    phase+=0.003;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---- STATUT ----
function mettreAJourStatut() {
  const point = document.getElementById('statut-point');
  if (!point) return;
  if (navigator.onLine) point.classList.add('en-ligne');
  else point.classList.remove('en-ligne');
}
window.addEventListener('online', mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);

// ---- DATE ----
function afficherDate() {
  const el = document.getElementById('dash-date');
  if (!el) return;
  const now = new Date();
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  el.textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
}

// ---- NAVIGATION ----
let pageActuelle = 'accueil';
window.allerPage = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('actif'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('actif');
  pageActuelle = page;
  if (page === 'patients') chargerPatients();
  if (page === 'consultations') chargerConsultationsAgent();
  if (page === 'alertes') chargerAlertes();
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

// ---- ALERTES UI ----
function afficherErreurForm(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alerte visible erreur';
}
function afficherSuccesForm(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alerte visible succes';
}

// ---- MODALS ----
window.ouvrirModal = function(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('visible');
};
window.fermerModal = function(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('visible');
};

// ---- PATIENTS ----
let tousPatients = [];

async function chargerPatients() {
  const liste = document.getElementById('liste-patients');
  if (!liste) return;
  try {
    const data = await Api.requete('GET', '/patients');
    tousPatients = data.data?.patients || data.patients || [];
    afficherPatients(tousPatients);
    const el = document.getElementById('stat-patients');
    if (el) el.textContent = tousPatients.length;
  } catch(e) {
    liste.innerHTML = `<div class="etat-vide"><span>Erreur de chargement</span></div>`;
  }
}

function afficherPatients(patients) {
  const liste = document.getElementById('liste-patients');
  if (!liste) return;
  if (!patients.length) {
    liste.innerHTML = `<div class="etat-vide"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg><span>Aucun patient enregistré</span></div>`;
    return;
  }
  liste.innerHTML = patients.map(p => {
    const initiales = `${(p.prenom||'?')[0]}${(p.nom||'?')[0]}`.toUpperCase();
    const age = p.date_naissance ? Math.floor((new Date() - new Date(p.date_naissance)) / (365.25*24*60*60*1000)) : '?';
    return `<div class="patient-item" onclick="voirDossier('${p.id}')">
      <div class="patient-avatar">${initiales}</div>
      <div class="patient-info">
        <div class="patient-nom">${p.prenom} ${p.nom}</div>
        <div class="patient-details">${age} ans · ${p.sexe === 'M' ? 'Homme' : 'Femme'} · ${p.telephone || '—'}</div>
      </div>
      <svg class="patient-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');
}

window.filtrerPatients = function(terme) {
  if (!terme) { afficherPatients(tousPatients); return; }
  const t = terme.toLowerCase();
  const filtres = tousPatients.filter(p =>
    `${p.prenom} ${p.nom}`.toLowerCase().includes(t) ||
    (p.telephone || '').includes(t)
  );
  afficherPatients(filtres);
};

// ---- DOSSIER PATIENT ----
window.voirDossier = async function(patientId) {
  ouvrirModal('modal-dossier');
  const contenu = document.getElementById('contenu-dossier');
  contenu.innerHTML = `<div class="etat-chargement"><div class="loading-ecg"></div><span>Chargement du dossier…</span></div>`;
  try {
    const [patientRes, consRes, vaccRes] = await Promise.allSettled([
      Api.requete('GET', `/patients/${patientId}`),
      Api.requete('GET', `/consultations/patient/${patientId}`),
      Api.requete('GET', `/vaccinations/patient/${patientId}`)
    ]);
    const p = patientRes.value?.data || patientRes.value || {};
    const cons = consRes.value?.data?.consultations || consRes.value?.consultations || [];
    const vacc = vaccRes.value?.data?.vaccinations || vaccRes.value?.vaccinations || [];
    const age = p.date_naissance ? Math.floor((new Date() - new Date(p.date_naissance)) / (365.25*24*60*60*1000)) : '?';
    document.getElementById('dossier-titre').textContent = `${p.prenom || ''} ${p.nom || ''}`;
    contenu.innerHTML = `
      <div class="dossier-section">
        <div class="qr-container">
          <div class="qr-code-id">KS-${(p.id||'').substring(0,8).toUpperCase()}</div>
          <div style="font-size:var(--text-xs);color:var(--texte-doux)">ID Patient · QR Code</div>
        </div>
      </div>
      <div class="dossier-section">
        <div class="dossier-section-titre">Informations personnelles</div>
        <div class="dossier-grid">
          <div class="dossier-champ"><span class="dossier-label">Prénom</span><span class="dossier-valeur">${p.prenom||'—'}</span></div>
          <div class="dossier-champ"><span class="dossier-label">Nom</span><span class="dossier-valeur">${p.nom||'—'}</span></div>
          <div class="dossier-champ"><span class="dossier-label">Âge</span><span class="dossier-valeur">${age} ans</span></div>
          <div class="dossier-champ"><span class="dossier-label">Sexe</span><span class="dossier-valeur">${p.sexe==='M'?'Homme':'Femme'}</span></div>
          <div class="dossier-champ"><span class="dossier-label">Groupe sanguin</span><span class="dossier-valeur">${p.groupe_sanguin||'—'}</span></div>
          <div class="dossier-champ"><span class="dossier-label">Téléphone</span><span class="dossier-valeur">${p.telephone||'—'}</span></div>
          <div class="dossier-champ" style="grid-column:span 2"><span class="dossier-label">Allergies</span><span class="dossier-valeur">${p.allergies||'Aucune connue'}</span></div>
        </div>
      </div>
      <div class="dossier-section">
        <div class="dossier-section-titre">Consultations (${cons.length})</div>
        ${cons.length ? cons.slice(0,5).map(c => `
          <div class="consultation-item">
            <div class="consultation-top">
              <div class="consultation-motif">${c.motif||'Consultation'}</div>
              <div class="consultation-date-badge">${new Date(c.date_consultation||c.created_at).toLocaleDateString('fr-FR')}</div>
            </div>
            ${c.diagnostic ? `<div class="consultation-diag">Diag: ${c.diagnostic}</div>` : ''}
            ${c.traitement ? `<div class="consultation-diag">Trt: ${c.traitement}</div>` : ''}
          </div>`).join('') : '<div class="etat-vide"><span>Aucune consultation</span></div>'}
      </div>
      <div class="dossier-section">
        <div class="dossier-section-titre">Vaccinations (${vacc.length})</div>
        ${vacc.length ? vacc.map(v => `
          <div class="rappel-item">
            <div class="rappel-icone">💉</div>
            <div class="rappel-info">
              <div class="rappel-nom">${v.vaccin_nom||'Vaccin'}</div>
              <div class="rappel-date">${new Date(v.date_admin).toLocaleDateString('fr-FR')} · Lot: ${v.lot||'—'}</div>
            </div>
            ${v.prochain_rappel ? `<span class="rappel-statut normal">${new Date(v.prochain_rappel).toLocaleDateString('fr-FR')}</span>` : ''}
          </div>`).join('') : '<div class="etat-vide"><span>Aucune vaccination</span></div>'}
      </div>
      <div style="padding-bottom:var(--space-4)">
        <button class="btn-primaire" onclick="fermerModal('modal-dossier');allerPage('consultations');ouvrirFormConsultation('${p.id}')">
          + Nouvelle consultation
        </button>
      </div>`;
  } catch(e) {
    contenu.innerHTML = `<div class="etat-vide"><span>Erreur de chargement du dossier</span></div>`;
  }
};

// ---- FORM PATIENT ----
window.ouvrirFormPatient = function() { ouvrirModal('modal-patient'); };

document.getElementById('form-patient')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prenom      = document.getElementById('p-prenom').value.trim();
  const nom         = document.getElementById('p-nom').value.trim();
  const date_naissance = document.getElementById('p-ddn').value;
  const sexe        = document.getElementById('p-sexe').value;
  const groupe_sanguin = document.getElementById('p-groupe').value;
  const langue      = document.getElementById('p-langue').value;
  const telephone   = document.getElementById('p-tel').value.trim();
  const allergies   = document.getElementById('p-allergies').value.trim();
  const btn         = e.target.querySelector('.btn-primaire');

  if (!prenom || !nom || !date_naissance || !sexe) {
    afficherErreurForm('alerte-patient', 'Veuillez remplir les champs obligatoires (*)');
    return;
  }
  btn.disabled = true;
  afficherLoading('Enregistrement du patient…');
  try {
    const data = await Api.requete('POST', '/patients', {
      prenom, nom, date_naissance, sexe, groupe_sanguin, langue, telephone, allergies
    });
    cacherLoading();
    afficherSuccesForm('alerte-patient', 'Patient enregistré avec succès !');
    await chargerPatients();
    setTimeout(() => {
      fermerModal('modal-patient');
      e.target.reset();
      const p = data.data?.patient || data.patient;
      if (p) voirDossier(p.id);
    }, 1000);
  } catch(err) {
    cacherLoading();
    btn.disabled = false;
    afficherErreurForm('alerte-patient', err.message || 'Erreur lors de l\'enregistrement');
  }
});

// ---- CONSULTATIONS ----
let patientsSelectCache = [];

window.ouvrirFormConsultation = function(patientId) {
  ouvrirModal('modal-consultation');
  const select = document.getElementById('c-patient');
  if (select && tousPatients.length) {
    select.innerHTML = '<option value="">-- Sélectionner un patient --</option>' +
      tousPatients.map(p => `<option value="${p.id}" ${p.id===patientId?'selected':''}>${p.prenom} ${p.nom}</option>`).join('');
  }
};

async function chargerConsultationsAgent() {
  const liste = document.getElementById('liste-consultations-agent');
  if (!liste) return;
  try {
    const user = Api.getUtilisateur();
    const patientsData = await Api.requete('GET', '/patients');
    const patients = patientsData.data?.patients || [];
    let toutes = [];
    for (const p of patients.slice(0, 10)) {
      try {
        const res = await Api.requete('GET', `/consultations/patient/${p.id}`);
        const cons = res.data?.consultations || res.consultations || [];
        cons.forEach(c => { c.patient_nom = `${p.prenom} ${p.nom}`; });
        toutes = toutes.concat(cons);
      } catch(e) {}
    }
    toutes.sort((a,b) => new Date(b.date_consultation||b.created_at) - new Date(a.date_consultation||a.created_at));
    const el = document.getElementById('stat-consultations');
    if (el) el.textContent = toutes.length;
    if (!toutes.length) {
      liste.innerHTML = `<div class="etat-vide"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg><span>Aucune consultation</span></div>`;
      return;
    }
    liste.innerHTML = toutes.slice(0,20).map(c => `
      <div class="consultation-item">
        <div class="consultation-top">
          <div class="consultation-motif">${c.motif||'Consultation'}</div>
          <div class="consultation-date-badge">${new Date(c.date_consultation||c.created_at).toLocaleDateString('fr-FR')}</div>
        </div>
        <div class="consultation-patient">${c.patient_nom||'—'}</div>
        ${c.diagnostic ? `<div class="consultation-diag">${c.diagnostic}</div>` : ''}
      </div>`).join('');
  } catch(e) {
    liste.innerHTML = `<div class="etat-vide"><span>Erreur de chargement</span></div>`;
  }
}

document.getElementById('form-consultation')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const patient_id = document.getElementById('c-patient').value;
  const motif      = document.getElementById('c-motif').value.trim();
  const diagnostic = document.getElementById('c-diagnostic').value.trim();
  const traitement = document.getElementById('c-traitement').value.trim();
  const symptomesRaw = document.getElementById('c-symptomes').value.trim();
  const structure  = document.getElementById('c-structure').value.trim();
  const btn        = e.target.querySelector('.btn-primaire');
  if (!patient_id || !motif) {
    afficherErreurForm('alerte-consultation', 'Patient et motif sont obligatoires.');
    return;
  }
  const symptomes = symptomesRaw ? symptomesRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
  btn.disabled = true;
  afficherLoading('Enregistrement de la consultation…');
  try {
    await Api.requete('POST', '/consultations', { patient_id, motif, diagnostic, traitement, symptomes, structure });
    cacherLoading();
    afficherSuccesForm('alerte-consultation', 'Consultation enregistrée !');
    setTimeout(() => { fermerModal('modal-consultation'); e.target.reset(); }, 1000);
  } catch(err) {
    cacherLoading();
    btn.disabled = false;
    afficherErreurForm('alerte-consultation', err.message || 'Erreur lors de l\'enregistrement');
  }
});

// ---- ALERTES ----
async function chargerAlertes() {
  const liste = document.getElementById('liste-alertes');
  if (!liste) return;
  try {
    const data = await Api.requete('GET', '/alertes');
    const alertes = data.data?.alertes || data.alertes || [];
    const el = document.getElementById('stat-alertes');
    if (el) el.textContent = alertes.length;
    if (!alertes.length) {
      liste.innerHTML = `<div class="etat-vide"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg><span>Aucune alerte active</span></div>`;
      return;
    }
    liste.innerHTML = alertes.map(a => `
      <div class="alerte-item">
        <div class="alerte-titre">${a.type_alerte || a.description || 'Alerte sanitaire'}</div>
        <div class="alerte-details">${a.nombre_cas ? `${a.nombre_cas} cas · ` : ''}${new Date(a.date_detection||a.created_at).toLocaleDateString('fr-FR')}</div>
        <span class="alerte-statut ${a.statut||'active'}">${a.statut === 'resolue' ? 'Résolue' : 'Active'}</span>
      </div>`).join('');
  } catch(e) {
    liste.innerHTML = `<div class="etat-vide"><span>Erreur de chargement</span></div>`;
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
      liste.innerHTML = `<div class="etat-vide"><span>Aucun rappel vaccinal cette semaine</span></div>`;
      return;
    }
    liste.innerHTML = rappels.map(r => {
      const date = r.prochain_rappel ? new Date(r.prochain_rappel).toLocaleDateString('fr-FR') : '—';
      const diff = r.prochain_rappel ? Math.ceil((new Date(r.prochain_rappel)-new Date())/(1000*60*60*24)) : 999;
      let statut = 'ok', label = date;
      if (diff < 0)  { statut='urgent'; label='En retard'; }
      else if (diff<=7){ statut='urgent'; label=`Dans ${diff}j`; }
      return `<div class="rappel-item">
        <div class="rappel-icone">💉</div>
        <div class="rappel-info">
          <div class="rappel-nom">${r.vaccin_nom||'Vaccin'} · ${r.prenom||''} ${r.nom||''}</div>
          <div class="rappel-date">${date} · ${r.telephone||'—'}</div>
        </div>
        <span class="rappel-statut ${statut}">${label}</span>
      </div>`;
    }).join('');
  } catch(e) {
    liste.innerHTML = `<div class="etat-vide"><span>Erreur de chargement</span></div>`;
  }
}

// ---- TRADUCTION ----
let langueActuelle = 'moore';
let timerTraduction = null;

window.changerLangue = function(btn) {
  document.querySelectorAll('.langue-btn').forEach(b => b.classList.remove('actif'));
  btn.classList.add('actif');
  langueActuelle = btn.dataset.langue;
  const terme = document.getElementById('search-traduction')?.value;
  if (terme) traduire(terme);
};

window.traduire = function(terme) {
  clearTimeout(timerTraduction);
  timerTraduction = setTimeout(async () => {
    const resultat = document.getElementById('resultats-traduction');
    if (!terme || terme.length < 2) {
      resultat.innerHTML = `<div class="etat-vide"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 0 1 6.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/></svg><span>Tapez un terme pour traduire</span></div>`;
      return;
    }
    try {
      const data = await Api.requete('GET', `/traduction/rechercher?terme=${encodeURIComponent(terme)}&langue=${langueActuelle}`);
      const resultats = data.data?.resultats || [];
      if (!resultats.length) {
        resultat.innerHTML = `<div class="etat-vide"><span>Terme "${terme}" non trouvé dans le dictionnaire</span></div>`;
        return;
      }
      resultat.innerHTML = resultats.map(r => `
        <div class="traduction-carte">
          <div class="traduction-terme-fr">🇫🇷 ${r.terme_fr || terme}</div>
          <div class="traduction-terme-local">${r.traduction || '—'}</div>
          ${r.pictogramme ? `<div class="traduction-pictogramme">🏥</div>` : ''}
        </div>`).join('');
    } catch(e) {
      resultat.innerHTML = `<div class="etat-vide"><span>Erreur de traduction</span></div>`;
    }
  }, 400);
};

// ---- DÉCONNEXION ----
document.getElementById('btn-deconnexion')?.addEventListener('click', async () => {
  if (!confirm('Se déconnecter ?')) return;
  await Api.deconnexion();
  window.location.href = '/';
});

// ---- INIT ----
async function chargerDashboard() {
  const user = Api.getUtilisateur();
  if (!user) { window.location.href = '/'; return; }
  const nomEl = document.getElementById('dash-nom');
  if (nomEl) nomEl.textContent = `${user.prenom||''} ${user.nom||''}`.trim() || '—';
  afficherDate();
  mettreAJourStatut();
  await Promise.allSettled([
    chargerPatients(),
    chargerRappels(),
    (async () => {
      try {
        const s = await Api.requete('GET', '/dashboard/stats');
        const d = s.data || {};
        const v = document.getElementById('stat-vaccins');
        if (v) v.textContent = d.vaccinations || 0;
        const a = document.getElementById('stat-alertes');
        if (a) a.textContent = d.alertes_actives || 0;
        const c = document.getElementById('stat-consultations');
        if (c) c.textContent = d.consultations || 0;
      } catch(e) {}
    })()
  ]);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!Api.estConnecte()) { window.location.href = '/'; return; }
  chargerDashboard();
});
