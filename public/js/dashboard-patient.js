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
    ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1.5;
    for (let i=0;i<canvas.width;i++) {
      const y = canvas.height/2 - valeurECG((i/canvas.width)*2+phase)*(canvas.height*0.4);
      i===0 ? ctx.moveTo(i,y) : ctx.lineTo(i,y);
    }
    ctx.stroke(); phase+=0.003;
    requestAnimationFrame(draw);
  }
  draw();
})();

// ---- UTILITAIRES ----
function mettreAJourStatut() {
  const p = document.getElementById('statut-point');
  if (p) { if (navigator.onLine) p.classList.add('en-ligne'); else p.classList.remove('en-ligne'); }
}
window.addEventListener('online', mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);

function afficherDate() {
  const el = document.getElementById('dash-date');
  if (!el) return;
  const now = new Date();
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  el.textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
}

function calculerAge(ddn) {
  if (!ddn) return '—';
  const n = new Date(ddn), a = new Date();
  let age = a.getFullYear() - n.getFullYear();
  if (a.getMonth() - n.getMonth() < 0 || (a.getMonth()===n.getMonth() && a.getDate()<n.getDate())) age--;
  return age + ' ans';
}

function set(id, val) { const e = document.getElementById(id); if (e) e.textContent = val ?? '—'; }

// ---- NAVIGATION ----
let carteInitialisee = false;
let mapPatient = null;

window.allerPage = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('actif'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('actif');
  if (page === 'sante') chargerConsultations();
  if (page === 'vaccins') chargerVaccins();
  if (page === 'carte' && !carteInitialisee) { initCartePatient(); carteInitialisee = true; }
  if (page === 'profil') afficherProfil();
};

// ---- PROFIL ----
function remplirHeader(user) {
  set('dash-nom', `${user.prenom||''} ${user.nom||''}`.trim());
  set('patient-id', user.id ? `KS-${String(user.id).substring(0,8).toUpperCase()}` : '—');
  set('patient-age', calculerAge(user.date_naissance));
  set('groupe-sanguin', user.groupe_sanguin || '—');
  set('patient-sexe', user.sexe === 'M' ? 'Masculin' : user.sexe === 'F' ? 'Féminin' : '—');
  const badge = document.getElementById('badge-role');
  if (badge) badge.textContent = 'Patient';
  if (user.qrDataURL) {
    const qr = document.getElementById('qr-code-container');
    if (qr) qr.innerHTML = `<img src="${user.qrDataURL}" width="150" height="150" style="border-radius:8px" alt="QR Code" />`;
  }
}

function afficherProfil() {
  const user = Api.getUtilisateur();
  if (!user) return;
  set('profil-prenom',   user.prenom || '—');
  set('profil-nom',      user.nom || '—');
  set('profil-tel',      user.telephone || '—');
  set('profil-ddn',      user.date_naissance ? new Date(user.date_naissance).toLocaleDateString('fr-FR') : '—');
  set('profil-sexe',     user.sexe === 'M' ? 'Masculin' : user.sexe === 'F' ? 'Féminin' : '—');
  set('profil-gs',       user.groupe_sanguin || 'Non renseigné');
  set('profil-allergies',user.allergies || 'Aucune connue');
  const langueEl = document.getElementById('profil-langue');
  if (langueEl && user.langue) langueEl.value = user.langue;
}

window.changerLangue = async function(langue) {
  const user = Api.getUtilisateur();
  if (!user) return;
  try {
    await Api.requete('PUT', `/patients/${user.id}`, { langue });
    Api.setUtilisateur({ ...user, langue });
  } catch(e) { console.warn('Langue:', e); }
};

window.partagerCarte = function() {
  const user = Api.getUtilisateur();
  if (!user) return;
  const texte = `Ma carte santé KiraSante BF\nNom: ${user.prenom} ${user.nom}\nID: KS-${String(user.id).substring(0,8).toUpperCase()}\nGroupe sanguin: ${user.groupe_sanguin||'—'}`;
  if (navigator.share) {
    navigator.share({ title: 'Ma carte santé KiraSante', text: texte });
  } else {
    navigator.clipboard?.writeText(texte);
    alert('Carte copiée dans le presse-papiers !');
  }
};

// ---- RAPPELS ----
async function chargerRappels(patientId) {
  const liste = document.getElementById('liste-rappels');
  const badge = document.getElementById('badge-rappels');
  try {
    const data = await Api.requete('GET', '/dashboard/rappels');
    const rappels = (data.data?.rappels || []).filter(r => !patientId || r.patient_id === patientId);
    if (badge) badge.textContent = rappels.length;
    set('stat-rappels', rappels.length);
    if (!liste) return;
    if (!rappels.length) {
      liste.innerHTML = '<div class="etat-vide">✅ Aucun rappel vaccinal en attente</div>';
      return;
    }
    liste.innerHTML = rappels.map(r => {
      const date = r.prochain_rappel ? new Date(r.prochain_rappel).toLocaleDateString('fr-FR') : '—';
      const diff = r.prochain_rappel ? Math.ceil((new Date(r.prochain_rappel)-new Date())/(1000*60*60*24)) : 999;
      const statut = diff < 0 ? 'urgent' : diff <= 7 ? 'urgent' : 'normal';
      const label  = diff < 0 ? 'En retard' : diff === 0 ? "Auj." : `Dans ${diff}j`;
      return `<div class="rappel-item">
        <div class="rappel-icone">💉</div>
        <div class="rappel-info"><div class="rappel-nom">${r.vaccin_nom||'Vaccin'}</div><div class="rappel-date">${date}</div></div>
        <span class="rappel-statut ${statut}">${label}</span>
      </div>`;
    }).join('');
  } catch(e) { if (liste) liste.innerHTML = '<div class="etat-vide">Erreur de chargement</div>'; }
}

// ---- ALERTES ----
async function chargerAlertes() {
  const liste = document.getElementById('liste-alertes-patient');
  try {
    const data = await Api.requete('GET', '/alertes/actives');
    const alertes = data.data?.alertes || [];
    set('stat-alertes', alertes.length);
    if (!liste) return;
    if (!alertes.length) {
      liste.innerHTML = '<div class="etat-vide">✅ Aucune alerte sanitaire active</div>';
      return;
    }
    liste.innerHTML = alertes.map(a => `
      <div style="background:#FDE8E8;border-radius:8px;padding:12px;margin-bottom:8px;border-left:3px solid var(--rouge-alerte)">
        <div style="font-weight:600;color:var(--rouge-alerte);font-size:14px">⚠️ ${a.type_alerte||'Alerte'}</div>
        <div style="font-size:12px;color:var(--texte-secondaire);margin-top:4px">${a.description||''} · ${a.nombre_cas||0} cas</div>
      </div>`).join('');
  } catch(e) { if (liste) liste.innerHTML = '<div class="etat-vide">Pas d\'alertes actives</div>'; }
}

// ---- CONSULTATIONS ----
async function chargerConsultations() {
  const liste = document.getElementById('liste-consultations');
  const user = Api.getUtilisateur();
  if (!liste || !user) return;
  try {
    const data = await Api.requete('GET', `/consultations/patient/${user.id}`);
    const cons = data.data?.consultations || data.consultations || [];
    set('stat-consultations', cons.length);
    if (!cons.length) {
      liste.innerHTML = '<div class="etat-vide">🏥 Aucune consultation enregistrée</div>';
      return;
    }
    liste.innerHTML = cons.map(c => {
      const date = new Date(c.date_consultation||c.created_at).toLocaleDateString('fr-FR');
      return `<div class="consultation-item">
        <div class="consultation-date-bloc">
          <span class="consultation-jour">${new Date(c.date_consultation||c.created_at).getDate()}</span>
          <span class="consultation-mois">${['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][new Date(c.date_consultation||c.created_at).getMonth()]}</span>
        </div>
        <div class="consultation-info">
          <div class="consultation-motif">${c.motif||'Consultation'}</div>
          <div class="consultation-agent">${c.agent_prenom ? `Dr. ${c.agent_prenom} ${c.agent_nom||''}` : 'Agent de santé'}</div>
          ${c.diagnostic ? `<div class="consultation-notes">${c.diagnostic}</div>` : ''}
          ${c.traitement ? `<div class="consultation-notes" style="color:var(--vert-clinique)">💊 ${c.traitement}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  } catch(e) { liste.innerHTML = '<div class="etat-vide">Erreur de chargement</div>'; }
}

// ---- VACCINS ----
async function chargerVaccins() {
  const liste = document.getElementById('liste-vaccins-patient');
  const user = Api.getUtilisateur();
  if (!liste || !user) return;
  try {
    const data = await Api.requete('GET', `/vaccinations/patient/${user.id}`);
    const vaccins = data.data?.vaccinations || data.vaccinations || [];
    set('stat-vaccins', vaccins.length);
    if (!vaccins.length) {
      liste.innerHTML = '<div class="etat-vide">💉 Aucune vaccination enregistrée</div>';
      return;
    }
    liste.innerHTML = vaccins.map(v => {
      const date = new Date(v.date_admin).toLocaleDateString('fr-FR');
      const rappel = v.prochain_rappel ? new Date(v.prochain_rappel).toLocaleDateString('fr-FR') : null;
      const diff = v.prochain_rappel ? Math.ceil((new Date(v.prochain_rappel)-new Date())/(1000*60*60*24)) : null;
      return `<div class="rappel-item">
        <div class="rappel-icone">💉</div>
        <div class="rappel-info">
          <div class="rappel-nom">${v.vaccin_nom}</div>
          <div class="rappel-date">Administré le ${date}${v.lot ? ` · Lot: ${v.lot}` : ''}</div>
        </div>
        ${rappel ? `<span class="rappel-statut ${diff < 0 ? 'urgent' : 'normal'}">${diff < 0 ? 'Retard' : rappel}</span>` : '<span class="rappel-statut ok">✅</span>'}
      </div>`;
    }).join('');
  } catch(e) { liste.innerHTML = '<div class="etat-vide">Erreur de chargement</div>'; }
}

// ---- CARTE CENTRES PROCHES ----
let tousLieuxCarte = [];
let maPositionPatient = null;
let filtreTypeCarte = 'tous';

function distance(lat1,lng1,lat2,lng2) {
  const R=6371, dLat=(lat2-lat1)*Math.PI/180, dLng=(lng2-lng1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

async function initCartePatient() {
  try {
    const res = await fetch('/data/structures-sante.json');
    const data = await res.json();
    tousLieuxCarte = [
      ...data.centres,
      ...data.pharmacies.map(p => ({...p, type:'Pharmacie'}))
    ];
    mapPatient = L.map('map-patient').setView([12.3667, -1.5333], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:18 }).addTo(mapPatient);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        maPositionPatient = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapPatient.setView([maPositionPatient.lat, maPositionPatient.lng], 14);
        L.circleMarker([maPositionPatient.lat, maPositionPatient.lng], {
          radius:8, fillColor:'#0F6E5C', color:'#fff', weight:2, fillOpacity:1
        }).addTo(mapPatient).bindPopup('📍 Vous êtes ici');
        afficherCentresProches();
      }, () => afficherCentresProches());
    } else {
      afficherCentresProches();
    }
  } catch(e) { console.error('Carte:', e); }
}

function afficherCentresProches() {
  const liste = document.getElementById('liste-centres-patient');
  if (!liste) return;
  let items = tousLieuxCarte;
  if (filtreTypeCarte === 'urgence') items = items.filter(i => i.urgences);
  else if (filtreTypeCarte !== 'tous') items = items.filter(i => i.type === filtreTypeCarte || (filtreTypeCarte==='pharmacie' && i.type==='Pharmacie'));
  if (maPositionPatient) {
    items = items.map(i => ({...i, dist: distance(maPositionPatient.lat, maPositionPatient.lng, i.lat, i.lng)}));
    items.sort((a,b) => a.dist - b.dist);
  }
  const icones = { CHU:'🏛️', CHR:'🏥', CMA:'🏨', CSPS:'🏠', Clinique:'🏩', Pharmacie:'💊' };
  liste.innerHTML = items.slice(0,15).map(i => `
    <div style="background:var(--fond-carte);border-radius:12px;padding:12px;margin-bottom:8px;box-shadow:var(--shadow-sm);display:flex;gap:12px;align-items:flex-start">
      <div style="font-size:1.5rem">${icones[i.type]||'🏥'}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:14px;color:var(--texte-principal)">${i.nom}</div>
        <div style="font-size:12px;color:var(--texte-doux)">${i.type}${i.urgences?' · 🚨 Urgences':''}</div>
        ${i.dist !== undefined ? `<div style="font-size:12px;color:var(--vert-clinique);font-family:var(--font-mono);font-weight:600">📍 ${i.dist<1?Math.round(i.dist*1000)+'m':i.dist.toFixed(1)+'km'}</div>` : ''}
        ${i.horaires ? `<div style="font-size:11px;color:var(--texte-doux)">⏰ ${i.horaires}</div>` : ''}
        <div style="display:flex;gap:8px;margin-top:6px">
          ${i.telephone ? `<a href="tel:${i.telephone}" style="font-size:11px;padding:3px 10px;background:var(--vert-clair);color:var(--vert-clinique);border-radius:20px;font-weight:600;text-decoration:none">📞 Appeler</a>` : ''}
          <button onclick="ouvrirItineraire(${i.lat},${i.lng})" style="font-size:11px;padding:3px 10px;background:var(--orange-clair);color:#B87A00;border:none;border-radius:20px;font-weight:600;cursor:pointer">🗺️ Y aller</button>
        </div>
      </div>
    </div>`).join('');
  tousLieuxCarte.slice(0,10).forEach(i => {
    if (!i.lat || !i.lng || !mapPatient) return;
    L.circleMarker([i.lat,i.lng], {
      radius:6, fillColor: i.urgences ? '#D94F4F' : i.type==='Pharmacie' ? '#7C3AED' : '#0F6E5C',
      color:'#fff', weight:1.5, fillOpacity:0.8
    }).addTo(mapPatient).bindPopup(`<strong>${i.nom}</strong><br>${i.type}`);
  });
}

window.filtrerParType = function(type, btn) {
  filtreTypeCarte = type;
  document.querySelectorAll('.filtre-btn').forEach(b => b.classList.remove('actif'));
  if (btn) btn.classList.add('actif');
  afficherCentresProches();
};

window.filtrerCentres = function(terme) {
  const t = terme.toLowerCase();
  const items = tousLieuxCarte.filter(i => i.nom.toLowerCase().includes(t) || (i.type||'').toLowerCase().includes(t));
  const liste = document.getElementById('liste-centres-patient');
  if (liste && terme.length > 1) {
    const icones = { CHU:'🏛️', CHR:'🏥', CMA:'🏨', CSPS:'🏠', Clinique:'🏩', Pharmacie:'💊' };
    liste.innerHTML = items.map(i => `
      <div style="background:var(--fond-carte);border-radius:12px;padding:12px;margin-bottom:8px;box-shadow:var(--shadow-sm);display:flex;gap:12px">
        <div style="font-size:1.5rem">${icones[i.type]||'🏥'}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:14px">${i.nom}</div>
          <div style="font-size:12px;color:var(--texte-doux)">${i.type}</div>
          ${i.telephone ? `<a href="tel:${i.telephone}" style="font-size:11px;padding:3px 10px;background:var(--vert-clair);color:var(--vert-clinique);border-radius:20px;font-weight:600;text-decoration:none;display:inline-block;margin-top:4px">📞 Appeler</a>` : ''}
        </div>
      </div>`).join('');
  } else if (terme.length === 0) {
    afficherCentresProches();
  }
};

window.ouvrirItineraire = function(lat, lng) {
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
};

// ---- DECONNEXION ----
window.deconnecter = async function() {
  if (!confirm('Se déconnecter ?')) return;
  await Api.deconnexion();
  window.location.href = '/';
};

document.getElementById('btn-deconnexion')?.addEventListener('click', window.deconnecter);

// ---- INIT ----
async function init() {
  const user = Api.getUtilisateur();
  if (!user) { window.location.href = '/'; return; }
  remplirHeader(user);
  afficherDate();
  mettreAJourStatut();
  await Promise.allSettled([
    chargerRappels(user.id),
    chargerAlertes(),
    (async () => {
      try {
        const data = await Api.requete('GET', `/dossier/patient/${user.id}`);
        const p = data.data || {};
        if (p.qrDataURL) {
          const qr = document.getElementById('qr-code-container');
          if (qr) qr.innerHTML = `<img src="${p.qrDataURL}" width="150" height="150" style="border-radius:8px" alt="QR Code" />`;
          Api.setUtilisateur({...user, ...p});
          remplirHeader({...user, ...p});
        }
      } catch(e) {}
    })()
  ]);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!Api.estConnecte()) { window.location.href = '/'; return; }
  init();
});
