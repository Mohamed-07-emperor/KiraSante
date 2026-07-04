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
        const p = data.data?.patient || {};
        const extra = { consultations: data.data?.consultations||[], vaccinations: data.data?.vaccinations||[] };
        const userMaj = {...user, ...p};
        Api.setUtilisateur(userMaj);
        remplirHeader(userMaj);
        if (p.qrDataURL) {
          const qr = document.getElementById('qr-code-container');
          if (qr) qr.innerHTML = '<img src="' + p.qrDataURL + '" width="150" height="150" style="border-radius:8px" alt="QR Code" />';
        } else if (user.qr_code) {
          // Generer QR localement si pas fourni par le serveur
          const qr = document.getElementById('qr-code-container');
          if (qr) qr.innerHTML = '<div style="background:var(--vert-clair);border-radius:8px;padding:12px;text-align:center"><div style="font-family:var(--font-mono);font-size:11px;color:var(--vert-clinique);word-break:break-all">' + (user.qr_code||user.id) + '</div><div style="font-size:11px;color:var(--texte-doux);margin-top:4px">Code QR patient</div></div>';
        }
      } catch(e) { console.error('Dossier err:', e); }
    })()
  ]);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!Api.estConnecte()) { window.location.href = '/'; return; }
  const user = Api.getUtilisateur();
  if (!user || user.role !== 'patient') {
    Api.deconnexion();
    window.location.href='/';
    return;
  }
  init();
});

// ---- TRADUCTION PATIENT ----
let langueTraductionPatient = 'moore';
let timerTradPatient = null;

window.changerLanguePatient = function(btn) {
  document.querySelectorAll('.langue-btn').forEach(b => b.classList.remove('actif'));
  btn.classList.add('actif');
  langueTraductionPatient = btn.dataset.langue;
  const terme = document.getElementById('search-traduction-patient')?.value;
  if (terme) traduirePatient(terme);
};

window.traduirePatient = function(terme) {
  clearTimeout(timerTradPatient);
  timerTradPatient = setTimeout(async () => {
    const resultat = document.getElementById('resultats-traduction-patient');
    if (!resultat) return;
    if (!terme || terme.length < 2) {
      resultat.innerHTML = '<div class="etat-vide">Tapez un terme medical a traduire</div>';
      return;
    }
    try {
      const data = await Api.requete('GET', `/traduction/rechercher?terme=${encodeURIComponent(terme)}&langue=${langueTraductionPatient}`);
      const resultats = data.data?.resultats || [];
      if (!resultats.length) {
        resultat.innerHTML = `<div class="etat-vide">Terme "${terme}" non trouve</div>`;
        return;
      }
      resultat.innerHTML = resultats.map(r => `
        <div class="traduction-carte">
          <div class="traduction-terme-fr">FR: ${r.terme_fr || terme}</div>
          <div class="traduction-terme-local">${r.traduction || '—'}</div>
          <button onclick="lireTraductionPatient('${(r.traduction||'').replace(/'/g,"\\'")}')" style="margin-top:8px;background:var(--vert-clair);border:none;border-radius:8px;padding:6px 12px;color:var(--vert-clinique);cursor:pointer;font-size:12px">Ecouter</button>
        </div>`).join('');
    } catch(e) {
      resultat.innerHTML = '<div class="etat-vide">Erreur de traduction</div>';
    }
  }, 400);
};

window.lireTraductionPatient = function(texte) {
  if (!('speechSynthesis' in window)) { alert('Synthese vocale non disponible'); return; }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(texte);
  utterance.lang = 'fr-FR';
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
};

// ---- TELECHARGEMENT CARNET PDF ----
window.telechargerCarnetPDF = async function() {
  const user = Api.getUtilisateur();
  if (!user) return;
  const overlay = document.getElementById('loading-overlay');
  const texte = document.getElementById('loading-texte');
  if (overlay) overlay.classList.add('visible');
  if (texte) texte.textContent = 'Generation du carnet de sante…';
  try {
    const token = Api.getToken();
    const url = `/api/v1/export/pdf/patient/${user.id}`;
    const response = await fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!response.ok) throw new Error('Erreur generation PDF');
    const blob = await response.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `Carnet_Sante_${user.prenom}_${user.nom}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);
  } catch(e) {
    alert('Erreur lors du telechargement: ' + e.message);
  } finally {
    if (overlay) overlay.classList.remove('visible');
  }
};

// ---- TELEMÉDECINE PATIENT ----
let demandeActiveId = null;

window.envoyerDemande = async function() {
  const motif = document.getElementById('demande-motif')?.value.trim();
  const symptomes = document.getElementById('demande-symptomes')?.value.trim();
  const urgence = document.getElementById('demande-urgence')?.value || 'normale';
  const alerte = document.getElementById('alerte-demande');

  if (!motif) {
    if (alerte) { alerte.textContent = 'Veuillez indiquer le motif'; alerte.className = 'alerte visible erreur'; }
    return;
  }

  const overlay = document.getElementById('loading-overlay');
  const texte = document.getElementById('loading-texte');
  if (overlay) overlay.classList.add('visible');
  if (texte) texte.textContent = 'Envoi de la demande…';

  try {
    await Api.requete('POST', '/telemedecine/demandes', { motif, symptomes, urgence });
    if (overlay) overlay.classList.remove('visible');
    if (alerte) { alerte.textContent = 'Demande envoyee ! Un agent va vous prendre en charge.'; alerte.className = 'alerte visible succes'; }
    document.getElementById('demande-motif').value = '';
    document.getElementById('demande-symptomes').value = '';
    await chargerMesConsultations();
  } catch(e) {
    if (overlay) overlay.classList.remove('visible');
    if (alerte) { alerte.textContent = e.message || 'Erreur envoi'; alerte.className = 'alerte visible erreur'; }
  }
};

window.chargerMesConsultations = async function() {
  const liste = document.getElementById('liste-mes-demandes');
  const listeOrd = document.getElementById('liste-mes-ordonnances');
  try {
    const [demandesRes, ordRes] = await Promise.allSettled([
      Api.requete('GET', '/telemedecine/demandes/mes-demandes'),
      Api.requete('GET', '/telemedecine/ordonnances/mes-ordonnances')
    ]);

    const demandes = demandesRes.value?.data?.demandes || [];
    const ordonnances = ordRes.value?.data?.ordonnances || [];

    if (liste) {
      if (!demandes.length) {
        liste.innerHTML = '<div class="etat-vide">Aucune consultation en cours</div>';
      } else {
        liste.innerHTML = demandes.map(d => {
          const statuts = { 'en_attente': '⏳ En attente', 'en_cours': '🟢 En cours', 'terminee': '✅ Terminee' };
          const couleurs = { 'en_attente': '#F2A640', 'en_cours': '#0F6E5C', 'terminee': '#888' };
          const nonLus = parseInt(d.messages_non_lus || 0);
          return `<div style="background:var(--fond-carte);border-radius:12px;padding:14px;margin-bottom:8px;box-shadow:var(--shadow-sm);border-left:3px solid ${couleurs[d.statut]||'#888'}" onclick="ouvrirMessagerie('${d.id}','${d.motif}')">
            <div style="display:flex;align-items:center;justify-content:space-between">
              <div style="font-weight:600;font-size:14px">${d.motif}</div>
              ${nonLus > 0 ? `<span style="background:var(--rouge-alerte);color:#fff;border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px">${nonLus}</span>` : ''}
            </div>
            <div style="font-size:12px;color:var(--texte-doux);margin-top:4px">${statuts[d.statut]||d.statut}</div>
            ${d.agent_prenom ? `<div style="font-size:12px;color:var(--vert-clinique)">Agent: Dr. ${d.agent_prenom} ${d.agent_nom}</div>` : ''}
            <div style="font-size:11px;color:var(--texte-doux);margin-top:4px">${new Date(d.created_at).toLocaleDateString('fr-FR')}</div>
            <div style="font-size:11px;color:var(--vert-clinique);margin-top:4px">Appuyer pour voir les messages →</div>
          </div>`;
        }).join('');
      }
    }

    if (listeOrd) {
      if (!ordonnances.length) {
        listeOrd.innerHTML = '<div class="etat-vide">Aucune ordonnance</div>';
      } else {
        listeOrd.innerHTML = ordonnances.map(o => {
          const meds = Array.isArray(o.medicaments) ? o.medicaments : (typeof o.medicaments === 'object' ? Object.values(o.medicaments) : []);
          return `<div style="background:var(--vert-clair);border-radius:12px;padding:14px;margin-bottom:8px;border-left:3px solid var(--vert-clinique)">
            <div style="font-weight:600;font-size:14px;color:var(--vert-clinique)">Ordonnance du ${new Date(o.created_at).toLocaleDateString('fr-FR')}</div>
            <div style="font-size:12px;color:var(--texte-doux)">Dr. ${o.agent_prenom||''} ${o.agent_nom||''}</div>
            ${o.instructions ? `<div style="font-size:13px;margin-top:8px">${o.instructions}</div>` : ''}
            ${o.instructions_moore ? `<div style="font-size:12px;color:var(--vert-clinique);margin-top:4px">Mooré: ${o.instructions_moore}</div>` : ''}
            ${o.instructions_dioula ? `<div style="font-size:12px;color:var(--vert-clinique);margin-top:4px">Dioula: ${o.instructions_dioula}</div>` : ''}
          </div>`;
        }).join('');
      }
    }
  } catch(e) {
    if (liste) liste.innerHTML = '<div class="etat-vide">Erreur chargement</div>';
  }
};

window.ouvrirMessagerie = async function(demandeId, motif) {
  demandeActiveId = demandeId;
  const titre = document.getElementById('messagerie-titre');
  if (titre) titre.textContent = motif || 'Messagerie';
  allerPage('messagerie');
  await chargerMessages();
};

window.chargerMessages = async function() {
  if (!demandeActiveId) return;
  const liste = document.getElementById('liste-messages');
  try {
    const data = await Api.requete('GET', `/telemedecine/demandes/${demandeActiveId}/messages`);
    const messages = data.data?.messages || [];
    const user = Api.getUtilisateur();

    if (!liste) return;
    if (!messages.length) {
      liste.innerHTML = '<div class="etat-vide" style="padding:20px;text-align:center">Aucun message. Decrivez votre probleme.</div>';
      return;
    }

    liste.innerHTML = messages.map(m => {
      const estMoi = m.expediteur_type === 'patient';
      const couleur = estMoi ? 'var(--vert-clinique)' : 'var(--bleu-nuit)';
      const fond = estMoi ? 'var(--vert-clair)' : '#EEF6FF';
      const align = estMoi ? 'flex-end' : 'flex-start';
      return `<div style="display:flex;justify-content:${align};margin:8px 12px">
        <div style="max-width:75%;background:${fond};border-radius:12px;padding:10px 14px;border-bottom-${estMoi?'right':'left'}-radius:2px">
          <div style="font-size:11px;color:${couleur};font-weight:600;margin-bottom:4px">${estMoi ? 'Vous' : 'Agent de sante'}</div>
          <div style="font-size:13px;color:var(--texte-principal)">${m.contenu}</div>
          <div style="font-size:10px;color:var(--texte-doux);margin-top:4px;text-align:right">${new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>`;
    }).join('');

    liste.scrollTop = liste.scrollHeight;
  } catch(e) {
    if (liste) liste.innerHTML = '<div class="etat-vide">Erreur chargement messages</div>';
  }
};

window.envoyerMessage = async function() {
  if (!demandeActiveId) return;
  const input = document.getElementById('input-message');
  const contenu = input?.value.trim();
  if (!contenu) return;
  try {
    await Api.requete('POST', `/telemedecine/demandes/${demandeActiveId}/messages`, { contenu });
    if (input) input.value = '';
    await chargerMessages();
  } catch(e) {
    alert('Erreur: ' + e.message);
  }
};

// Auto-refresh messages toutes les 10 secondes si sur la page messagerie
setInterval(async () => {
  const pageMsg = document.getElementById('page-messagerie');
  if (pageMsg && pageMsg.classList.contains('active') && demandeActiveId) {
    await chargerMessages();
  }
}, 10000);

// ---- SUIVI GROSSESSE ----
window.declarerGrossesse = async function() {
  const ddr = document.getElementById('grossesse-ddr')?.value;
  const notes = document.getElementById('grossesse-notes')?.value;
  const alerte = document.getElementById('alerte-grossesse');

  if (!ddr) {
    if (alerte) { alerte.textContent = 'Date des dernieres regles requise'; alerte.className = 'alerte visible erreur'; }
    return;
  }

  const overlay = document.getElementById('loading-overlay');
  const texte = document.getElementById('loading-texte');
  if (overlay) overlay.classList.add('visible');
  if (texte) texte.textContent = 'Enregistrement grossesse...';

  try {
    const data = await Api.requete('POST', '/grossesse/declarer', { date_dernieres_regles: ddr, notes });
    if (overlay) overlay.classList.remove('visible');
    afficherGrossesse(data.data);
  } catch(e) {
    if (overlay) overlay.classList.remove('visible');
    if (alerte) { alerte.textContent = e.message || 'Erreur'; alerte.className = 'alerte visible erreur'; }
  }
};

window.chargerGrossesse = async function() {
  try {
    const data = await Api.requete('GET', '/grossesse/ma-grossesse');
    if (data.data?.grossesse) {
      afficherGrossesse(data.data);
    } else {
      document.getElementById('section-declarer-grossesse').style.display = 'block';
      document.getElementById('section-grossesse-active').style.display = 'none';
    }
  } catch(e) {
    console.error('Erreur grossesse:', e);
  }
};

function afficherGrossesse(data) {
  const { semaine_actuelle, date_accouchement_prevue, conseils, calendrier_cpn, cpns_effectuees } = data;

  document.getElementById('section-declarer-grossesse').style.display = 'none';
  document.getElementById('section-grossesse-active').style.display = 'block';

  // Infos principales
  const semEl = document.getElementById('grossesse-semaine');
  if (semEl) semEl.textContent = semaine_actuelle || '—';

  const ddaEl = document.getElementById('grossesse-dda');
  if (ddaEl && date_accouchement_prevue) {
    ddaEl.textContent = new Date(date_accouchement_prevue).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  }

  // Trimestre et emoji
  const trimEl = document.getElementById('grossesse-trimestre');
  const emojiEl = document.getElementById('grossesse-emoji');
  if (conseils) {
    if (trimEl) trimEl.textContent = `${conseils.trimestre}er trimestre`;
    if (emojiEl) emojiEl.textContent = conseils.trimestre === 1 ? '🌱' : conseils.trimestre === 2 ? '👶' : '🍼';
  }

  // Barre de progression
  const progress = Math.min(100, Math.round((semaine_actuelle / 40) * 100));
  const progressEl = document.getElementById('grossesse-progress');
  if (progressEl) progressEl.style.width = progress + '%';

  // Conseils
  const conseilsEl = document.getElementById('grossesse-conseils');
  if (conseilsEl && conseils) {
    conseilsEl.innerHTML = `
      <div style="background:var(--fond-chaud);border-radius:8px;padding:12px;margin-bottom:8px">
        <div style="font-size:13px;color:var(--texte-principal)">🇫🇷 ${conseils.conseil_fr}</div>
      </div>
      <div style="background:var(--vert-clair);border-radius:8px;padding:12px;margin-bottom:8px">
        <div style="font-size:11px;font-weight:600;color:var(--vert-clinique)">Mooré</div>
        <div style="font-size:13px;color:var(--texte-principal);margin-top:4px">${conseils.conseil_moore}</div>
        <button onclick="lireTraductionPatient('${conseils.conseil_moore}')" style="margin-top:6px;background:none;border:1px solid var(--vert-clinique);border-radius:6px;padding:4px 10px;color:var(--vert-clinique);cursor:pointer;font-size:11px">🔊 Ecouter</button>
      </div>
      <div style="background:#FFF8E1;border-radius:8px;padding:12px">
        <div style="font-size:11px;font-weight:600;color:#F57F17">Dioula</div>
        <div style="font-size:13px;color:var(--texte-principal);margin-top:4px">${conseils.conseil_dioula}</div>
        <button onclick="lireTraductionPatient('${conseils.conseil_dioula}')" style="margin-top:6px;background:none;border:1px solid #F57F17;border-radius:6px;padding:4px 10px;color:#F57F17;cursor:pointer;font-size:11px">🔊 Ecouter</button>
      </div>`;
  }

  // Calendrier CPN
  const calEl = document.getElementById('grossesse-calendrier');
  const badgeCPN = document.getElementById('badge-cpn');
  const cpnEffectuees = cpns_effectuees || [];
  if (badgeCPN) badgeCPN.textContent = `${cpnEffectuees.length}/8`;

  if (calEl && calendrier_cpn) {
    calEl.innerHTML = calendrier_cpn.map(cpn => {
      const effectuee = cpnEffectuees.find(c => c.numero_cpn === cpn.numero);
      const estPassee = new Date(cpn.date) < new Date();
      const couleur = effectuee ? '#0F6E5C' : estPassee ? '#D94F4F' : '#F2A640';
      const icone = effectuee ? '✅' : estPassee ? '⚠️' : '📅';
      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bordure)">
        <div style="font-size:1.2rem">${icone}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px;color:${couleur}">CPN ${cpn.numero} — Semaine ${cpn.semaine}</div>
          <div style="font-size:12px;color:var(--texte-doux)">${new Date(cpn.date).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })}</div>
          ${effectuee ? `<div style="font-size:11px;color:var(--vert-clinique)">Effectuee le ${new Date(effectuee.date_cpn).toLocaleDateString('fr-FR')}</div>` : ''}
        </div>
        <span style="font-size:11px;padding:2px 8px;background:${couleur}20;color:${couleur};border-radius:20px;font-weight:600">${effectuee ? 'Fait' : estPassee ? 'En retard' : 'A venir'}</span>
      </div>`;
    }).join('');
  }
}

// ---- MENU HAMBURGER ----
window.toggleMenu = function() {
  const menu = document.getElementById('menu-lateral');
  const overlay = document.getElementById('menu-overlay');
  const ouvert = menu.style.right === '0px';
  menu.style.right = ouvert ? '-280px' : '0px';
  overlay.style.display = ouvert ? 'none' : 'block';
};

window.fermerMenu = function() {
  const menu = document.getElementById('menu-lateral');
  const overlay = document.getElementById('menu-overlay');
  if (menu) menu.style.right = '-280px';
  if (overlay) overlay.style.display = 'none';
};

window.allerPageMenu = function(page) {
  fermerMenu();
  allerPage(page);
  document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('actif'));
  const actif = document.querySelector(`.menu-item[data-page="${page}"]`);
  if (actif) actif.classList.add('actif');
  const nomEl = document.getElementById('menu-nom-patient');
  const user = Api.getUtilisateur();
  if (nomEl && user) nomEl.textContent = user.prenom + ' ' + user.nom;
};
