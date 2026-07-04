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
    if (c < 0.3) return Math.sin(c*Math.PI*2)*0.15;
    if (c < 0.4) return -0.1;
    if (c < 0.42) return -0.3;
    if (c < 0.45) return 1.0;
    if (c < 0.48) return -0.25;
    if (c < 0.6) return Math.sin((c-0.48)*Math.PI/0.12)*0.2;
    return 0;
  }
  function draw() {
    canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.beginPath(); ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1.5;
    for (let i=0;i<canvas.width;i++) {
      const y = canvas.height/2 - valeurECG((i/canvas.width)*2+phase)*(canvas.height*0.4);
      i===0 ? ctx.moveTo(i,y) : ctx.lineTo(i,y);
    }
    ctx.stroke(); phase+=0.003; requestAnimationFrame(draw);
  }
  draw();
})();

// ---- UTILS ----
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
  const mois = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  el.textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
}

function afficherLoading(msg) {
  const o = document.getElementById('loading-overlay');
  const t = document.getElementById('loading-texte');
  if (o) o.classList.add('visible');
  if (t) t.textContent = msg||'Chargement…';
}
function cacherLoading() { const o = document.getElementById('loading-overlay'); if (o) o.classList.remove('visible'); }

function afficherErreurForm(id, msg) { const el = document.getElementById(id); if (el) { el.textContent=msg; el.className='alerte visible erreur'; } }
function afficherSuccesForm(id, msg) { const el = document.getElementById(id); if (el) { el.textContent=msg; el.className='alerte visible succes'; } }

window.ouvrirModal = function(id) { const m=document.getElementById(id); if (m) m.classList.add('visible'); };
window.fermerModal = function(id) { const m=document.getElementById(id); if (m) m.classList.remove('visible'); };

// ---- NAVIGATION ----
let carteAgentInit = false;
let scannerActif = false;
let videoStream = null;

window.allerPage = function(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('actif'));
  const pageEl = document.getElementById('page-'+page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('actif');
  if (page==='patients') chargerPatients();
  if (page==='consultations') chargerConsultationsAgent();
  if (page==='vaccinations') chargerVaccinationsAgent();
  if (page==='alertes') chargerAlertesAgent();
  if (page==='carte' && !carteAgentInit) { initCarteAgent(); carteAgentInit=true; }
  if (page==='scanner') demarrerScanner();
  if (page!=='scanner' && videoStream) { videoStream.getTracks().forEach(t=>t.stop()); scannerActif=false; }
};

// ---- PATIENTS ----
let tousPatients = [];

async function chargerPatients() {
  const liste = document.getElementById('liste-patients');
  try {
    const data = await Api.requete('GET', '/patients');
    tousPatients = data.data?.patients || [];
    document.getElementById('stat-patients').textContent = tousPatients.length;
    afficherPatients(tousPatients);
    remplirSelectPatients();
  } catch(e) { if (liste) liste.innerHTML='<div class="etat-vide">Erreur chargement</div>'; }
}

function afficherPatients(patients) {
  const liste = document.getElementById('liste-patients');
  if (!liste) return;
  if (!patients.length) { liste.innerHTML='<div class="etat-vide">Aucun patient enregistré</div>'; return; }
  liste.innerHTML = patients.map(p => {
    const ini = `${(p.prenom||'?')[0]}${(p.nom||'?')[0]}`.toUpperCase();
    const age = p.date_naissance ? Math.floor((new Date()-new Date(p.date_naissance))/(365.25*24*60*60*1000)) : '?';
    return `<div class="patient-item" onclick="voirDossier('${p.id}')">
      <div class="patient-avatar">${ini}</div>
      <div class="patient-info">
        <div class="patient-nom">${p.prenom} ${p.nom}</div>
        <div class="patient-details">${age} ans · ${p.sexe==='M'?'Homme':'Femme'} · ${p.telephone||'—'}</div>
      </div>
      <svg class="patient-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');
}

window.filtrerPatients = function(terme) {
  if (!terme) { afficherPatients(tousPatients); return; }
  const t = terme.toLowerCase();
  afficherPatients(tousPatients.filter(p => `${p.prenom} ${p.nom}`.toLowerCase().includes(t) || (p.telephone||'').includes(t)));
};

function remplirSelectPatients() {
  ['c-patient','v-patient'].forEach(id => {
    const sel = document.getElementById(id);
    if (sel) sel.innerHTML = '<option value="">-- Sélectionner --</option>' +
      tousPatients.map(p => `<option value="${p.id}">${p.prenom} ${p.nom}</option>`).join('');
  });
}

// ---- DOSSIER ----
window.voirDossier = async function(patientId) {
  ouvrirModal('modal-dossier');
  const contenu = document.getElementById('contenu-dossier');
  contenu.innerHTML = '<div class="etat-chargement"><div class="loading-ecg"></div><span>Chargement…</span></div>';
  try {
    const [patRes, consRes, vaccRes] = await Promise.allSettled([
      Api.requete('GET', `/dossier/patient/${patientId}`),
      Api.requete('GET', `/consultations/patient/${patientId}`),
      Api.requete('GET', `/vaccinations/patient/${patientId}`)
    ]);
    const p = patRes.value?.data || {};
    const cons = consRes.value?.data?.consultations || [];
    const vacc = vaccRes.value?.data?.vaccinations || [];
    const age = p.date_naissance ? Math.floor((new Date()-new Date(p.date_naissance))/(365.25*24*60*60*1000)) : '?';
    document.getElementById('dossier-titre').textContent = `${p.prenom||''} ${p.nom||''}`;
    contenu.innerHTML = `
      <div class="dossier-section">
        <div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--vert-clair);border-radius:12px;margin-bottom:12px">
          ${p.qrDataURL ? `<img src="${p.qrDataURL}" width="80" height="80" style="border-radius:8px" />` : '<div style="width:80px;height:80px;background:var(--bordure);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:24px">📋</div>'}
          <div>
            <div style="font-family:var(--font-mono);font-size:14px;color:var(--vert-clinique);font-weight:600">${p.qr_code||'—'}</div>
            <div style="font-size:12px;color:var(--texte-doux)">ID Patient KiraSante</div>
          </div>
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
          <div class="dossier-champ" style="grid-column:span 2"><span class="dossier-label">Allergies</span><span class="dossier-valeur">${p.allergies||'Aucune'}</span></div>
        </div>
      </div>
      <div class="dossier-section">
        <div class="dossier-section-titre">Consultations (${cons.length})</div>
        ${cons.length ? cons.slice(0,5).map(c=>`
          <div class="consultation-item" style="border-left:3px solid var(--vert-clinique);padding-left:12px;margin-bottom:8px">
            <div style="font-weight:600;font-size:13px">${c.motif||'Consultation'}</div>
            <div style="font-size:11px;color:var(--texte-doux)">${new Date(c.date_consultation||c.created_at).toLocaleDateString('fr-FR')}</div>
            ${c.diagnostic?`<div style="font-size:12px;color:var(--texte-secondaire)">${c.diagnostic}</div>`:''}
            ${c.traitement?`<div style="font-size:12px;color:var(--vert-clinique)">💊 ${c.traitement}</div>`:''}
          </div>`).join('') : '<div class="etat-vide">Aucune consultation</div>'}
      </div>
      <div class="dossier-section">
        <div class="dossier-section-titre">Vaccinations (${vacc.length})</div>
        ${vacc.length ? vacc.map(v=>`
          <div class="rappel-item">
            <div class="rappel-icone">💉</div>
            <div class="rappel-info"><div class="rappel-nom">${v.vaccin_nom}</div><div class="rappel-date">${new Date(v.date_admin).toLocaleDateString('fr-FR')}</div></div>
          </div>`).join('') : '<div class="etat-vide">Aucune vaccination</div>'}
      </div>
      ${grossRes && grossRes.value && grossRes.value.data && grossRes.value.data.grossesse ? `
      <div class="dossier-section" style="margin-top:12px">
        <div class="dossier-section-titre">GROSSESSE EN COURS</div>
        <div style="background:#FCE4EC;border-radius:8px;padding:12px">
          <div style="font-weight:600;color:#E91E63">Semaine ${grossRes.value.data.semaine_actuelle || '?'}</div>
          <div style="font-size:12px;color:#AD1457">Accouchement prevu: ${grossRes.value.data.grossesse.date_accouchement_prevue ? new Date(grossRes.value.data.grossesse.date_accouchement_prevue).toLocaleDateString('fr-FR') : '?'}</div>
          <div style="font-size:12px;margin-top:4px">CPN effectuees: ${grossRes.value.data.grossesse.nombre_cpn || 0}/8</div>
        </div>
      </div>` : ''}
      <button class="btn-primaire" style="margin-top:12px" onclick="fermerModal('modal-dossier');allerPage('consultations');ouvrirFormConsultation('${p.id}')">
        + Nouvelle consultation
      </button>`;
  } catch(e) { contenu.innerHTML='<div class="etat-vide">Erreur chargement</div>'; }
};

// ---- FORM PATIENT ----
window.ouvrirFormPatient = function() { ouvrirModal('modal-patient'); };

document.getElementById('form-patient')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const prenom=document.getElementById('p-prenom').value.trim();
  const nom=document.getElementById('p-nom').value.trim();
  const date_naissance=document.getElementById('p-ddn').value;
  const sexe=document.getElementById('p-sexe').value;
  const groupe_sanguin=document.getElementById('p-groupe').value;
  const langue=document.getElementById('p-langue').value;
  const telephone=document.getElementById('p-tel').value.trim();
  const allergies=document.getElementById('p-allergies').value.trim();
  const btn=e.target.querySelector('.btn-primaire');
  if (!prenom||!nom||!date_naissance||!sexe) { afficherErreurForm('alerte-patient','Champs obligatoires manquants'); return; }
  btn.disabled=true; afficherLoading('Enregistrement…');
  try {
    const data = await Api.requete('POST','/patients',{prenom,nom,date_naissance,sexe,groupe_sanguin,langue,telephone,allergies});
    cacherLoading(); afficherSuccesForm('alerte-patient','Patient enregistré !');
    await chargerPatients();
    setTimeout(()=>{ fermerModal('modal-patient'); e.target.reset(); if(data.data?.patient) voirDossier(data.data.patient.id); },1000);
  } catch(err) { cacherLoading(); btn.disabled=false; afficherErreurForm('alerte-patient',err.message||'Erreur'); }
});

// ---- CONSULTATIONS ----
window.ouvrirFormConsultation = function(patientId) {
  ouvrirModal('modal-consultation');
  if (patientId) { const sel=document.getElementById('c-patient'); if(sel) sel.value=patientId; }
};

async function chargerConsultationsAgent() {
  const liste = document.getElementById('liste-consultations-agent');
  if (!liste) return;
  try {
    if (!tousPatients.length) await chargerPatients();
    let toutes = [];
    for (const p of tousPatients.slice(0,15)) {
      try {
        const res = await Api.requete('GET',`/consultations/patient/${p.id}`);
        const cons = res.data?.consultations||[];
        cons.forEach(c=>{ c.patient_nom=`${p.prenom} ${p.nom}`; });
        toutes = toutes.concat(cons);
      } catch(e) {}
    }
    toutes.sort((a,b)=>new Date(b.date_consultation||b.created_at)-new Date(a.date_consultation||a.created_at));
    document.getElementById('stat-consultations').textContent = toutes.length;
    if (!toutes.length) { liste.innerHTML='<div class="etat-vide">Aucune consultation</div>'; return; }
    liste.innerHTML = toutes.slice(0,20).map(c=>`
      <div class="consultation-item">
        <div class="consultation-date-bloc">
          <span class="consultation-jour">${new Date(c.date_consultation||c.created_at).getDate()}</span>
          <span class="consultation-mois">${['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'][new Date(c.date_consultation||c.created_at).getMonth()]}</span>
        </div>
        <div class="consultation-info">
          <div class="consultation-motif">${c.motif||'Consultation'}</div>
          <div class="consultation-patient">${c.patient_nom||'—'}</div>
          ${c.diagnostic?`<div class="consultation-diag">${c.diagnostic}</div>`:''}
        </div>
      </div>`).join('');
  } catch(e) { liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

document.getElementById('form-consultation')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const patient_id=document.getElementById('c-patient').value;
  const motif=document.getElementById('c-motif').value.trim();
  const diagnostic=document.getElementById('c-diagnostic').value.trim();
  const traitement=document.getElementById('c-traitement').value.trim();
  const symptomes=(document.getElementById('c-symptomes').value.trim()).split(',').map(s=>s.trim()).filter(Boolean);
  const structure=document.getElementById('c-structure').value.trim();
  const btn=e.target.querySelector('.btn-primaire');
  if (!patient_id||!motif) { afficherErreurForm('alerte-consultation','Patient et motif requis'); return; }
  btn.disabled=true; afficherLoading('Enregistrement…');
  try {
    await Api.requete('POST','/consultations',{patient_id,motif,diagnostic,traitement,symptomes,structure});
    cacherLoading(); afficherSuccesForm('alerte-consultation','Consultation enregistrée !');
    setTimeout(()=>{ fermerModal('modal-consultation'); e.target.reset(); },1000);
  } catch(err) { cacherLoading(); btn.disabled=false; afficherErreurForm('alerte-consultation',err.message||'Erreur'); }
});

// ---- VACCINATIONS ----
window.ouvrirFormVaccin = function() {
  ouvrirModal('modal-vaccin');
  const dateEl=document.getElementById('v-date');
  if (dateEl) dateEl.value=new Date().toISOString().split('T')[0];
};

async function chargerVaccinationsAgent() {
  const liste = document.getElementById('liste-vaccinations-agent');
  if (!liste) return;
  try {
    if (!tousPatients.length) await chargerPatients();
    let total=0; const items=[];
    for (const p of tousPatients.slice(0,15)) {
      try {
        const res=await Api.requete('GET',`/vaccinations/patient/${p.id}`);
        const vacc=res.data?.vaccinations||[];
        total+=vacc.length;
        if (vacc.length) items.push({patient:p,vaccins:vacc});
      } catch(e) {}
    }
    document.getElementById('stat-vaccins').textContent=total;
    if (!items.length) { liste.innerHTML='<div class="etat-vide">Aucune vaccination</div>'; return; }
    liste.innerHTML=items.map(({patient:p,vaccins})=>`
      <div class="section-bloc" style="margin-bottom:12px">
        <div class="bloc-header">
          <span class="bloc-titre" style="font-size:14px">${p.prenom} ${p.nom}</span>
          <span class="bloc-badge">${vaccins.length}</span>
        </div>
        ${vaccins.map(v=>`
          <div class="rappel-item">
            <div class="rappel-icone">💉</div>
            <div class="rappel-info"><div class="rappel-nom">${v.vaccin_nom}</div><div class="rappel-date">${new Date(v.date_admin).toLocaleDateString('fr-FR')}${v.lot?` · ${v.lot}`:''}</div></div>
            ${v.prochain_rappel?`<span class="rappel-statut normal">${new Date(v.prochain_rappel).toLocaleDateString('fr-FR')}</span>`:''}
          </div>`).join('')}
      </div>`).join('');
  } catch(e) { liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

document.getElementById('form-vaccin')?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const patient_id=document.getElementById('v-patient').value;
  const vaccin_nom=document.getElementById('v-nom').value;
  const date_admin=document.getElementById('v-date').value;
  const lot=document.getElementById('v-lot').value.trim();
  const prochain_rappel=document.getElementById('v-rappel').value;
  const btn=e.target.querySelector('.btn-primaire');
  if (!patient_id||!vaccin_nom||!date_admin) { afficherErreurForm('alerte-vaccin','Champs requis'); return; }
  btn.disabled=true; afficherLoading('Enregistrement…');
  try {
    await Api.requete('POST','/vaccinations',{patient_id,vaccin_nom,date_admin,lot,prochain_rappel});
    cacherLoading(); afficherSuccesForm('alerte-vaccin','Vaccination enregistrée !');
    await chargerVaccinationsAgent();
    setTimeout(()=>{ fermerModal('modal-vaccin'); e.target.reset(); },1000);
  } catch(err) { cacherLoading(); btn.disabled=false; afficherErreurForm('alerte-vaccin',err.message||'Erreur'); }
});

// ---- SCANNER QR ----
async function demarrerScanner() {
  const video = document.getElementById('scan-video');
  const resultat = document.getElementById('resultat-scan');
  if (!video) return;

  // Arreter stream precedent
  if (videoStream) { videoStream.getTracks().forEach(t => t.stop()); videoStream = null; }

  // Verifier support camera
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    if (resultat) resultat.innerHTML = '<div class="etat-vide">📷 Camera non supportee. Utilisez la saisie manuelle.</div>';
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
    });
    videoStream = stream;
    video.srcObject = stream;
    video.setAttribute('playsinline', true);
    await video.play();
    scannerActif = true;

    // Charger jsQR dynamiquement si absent
    if (typeof jsQR === 'undefined') {
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
        s.onload = resolve; s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    function scan() {
      if (!scannerActif) return;
      if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        if (typeof jsQR !== 'undefined') {
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
          if (code && code.data) {
            scannerActif = false;
            if (videoStream) videoStream.getTracks().forEach(t => t.stop());
            traiterCodeQR(code.data);
            return;
          }
        }
      }
      requestAnimationFrame(scan);
    }
    requestAnimationFrame(scan);
  } catch(e) {
    console.error('Camera error:', e);
    if (resultat) resultat.innerHTML = '<div class="etat-vide">📷 Camera non disponible: ' + e.message + '. Utilisez la saisie manuelle ci-dessous.</div>';
  }
}

async function traiterCodeQR(code) {
  const resultat=document.getElementById('resultat-scan');
  if (resultat) resultat.innerHTML='<div class="etat-chargement"><div class="loading-ecg"></div><span>Recherche…</span></div>';
  try {
    const data=await Api.requete('GET',`/patients/qr/${encodeURIComponent(code)}`);
    const p=data.data||{};
    if (resultat) resultat.innerHTML=`
      <div style="background:var(--vert-clair);border-radius:12px;padding:16px;border-left:4px solid var(--vert-clinique)">
        <div style="font-size:1.5rem;text-align:center">✅</div>
        <div style="font-weight:700;font-size:16px;text-align:center;margin:8px 0">${p.prenom} ${p.nom}</div>
        <div style="font-size:12px;color:var(--texte-doux);text-align:center">${p.telephone||'—'} · ${p.groupe_sanguin||'—'}</div>
        <button class="btn-primaire" style="margin-top:12px" onclick="voirDossier('${p.id}')">Voir le dossier complet</button>
      </div>`;
  } catch(e) {
    if (resultat) resultat.innerHTML='<div style="background:#FDE8E8;border-radius:12px;padding:16px;text-align:center"><div style="color:var(--rouge-alerte);font-weight:600">❌ Patient introuvable</div></div>';
    setTimeout(()=>{ scannerActif=true; demarrerScanner(); },2000);
  }
}

window.rechercherQRManuel = async function() {
  const code=document.getElementById('code-manuel-agent').value.trim();
  if (code) await traiterCodeQR(code);
};

// ---- ALERTES ----
async function chargerAlertesAgent() {
  const liste=document.getElementById('liste-alertes-agent');
  if (!liste) return;
  try {
    const data=await Api.requete('GET','/alertes');
    const alertes=data.data?.alertes||[];
    document.getElementById('stat-alertes').textContent=alertes.length;
    if (!alertes.length) { liste.innerHTML='<div class="etat-vide">✅ Aucune alerte active</div>'; return; }
    liste.innerHTML=alertes.map(a=>`
      <div class="alerte-item">
        <div class="alerte-titre">⚠️ ${a.type_alerte||'Alerte'}</div>
        <div class="alerte-details">${a.nombre_cas||0} cas · ${new Date(a.date_detection||a.created_at).toLocaleDateString('fr-FR')}</div>
        <span class="alerte-statut ${a.statut||'active'}">${a.statut==='resolue'?'Résolue':'Active'}</span>
      </div>`).join('');
  } catch(e) { liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

// ---- CARTE ----
let lieuxCarte=[];
let filtreCarteAgent='tous';

async function initCarteAgent() {
  try {
    const res=await fetch('/data/structures-sante.json');
    const data=await res.json();
    lieuxCarte=[...data.centres,...data.pharmacies.map(p=>({...p,type:'Pharmacie'}))];
    const map=L.map('map-agent').setView([12.3667,-1.5333],12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(map);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos=>{
        map.setView([pos.coords.latitude,pos.coords.longitude],14);
        L.circleMarker([pos.coords.latitude,pos.coords.longitude],{radius:8,fillColor:'#0F6E5C',color:'#fff',weight:2,fillOpacity:1}).addTo(map).bindPopup('📍 Vous');
      });
    }
    lieuxCarte.slice(0,20).forEach(i=>{
      if (!i.lat||!i.lng) return;
      L.circleMarker([i.lat,i.lng],{radius:6,fillColor:i.urgences?'#D94F4F':i.type==='Pharmacie'?'#7C3AED':'#0F6E5C',color:'#fff',weight:1.5,fillOpacity:0.8})
        .addTo(map).bindPopup(`<strong>${i.nom}</strong><br>${i.type}${i.telephone?`<br>📞 ${i.telephone}`:''}`);
    });
    afficherListeCentresAgent();
  } catch(e) { console.error('Carte agent:',e); }
}

function afficherListeCentresAgent() {
  const liste=document.getElementById('liste-centres-agent');
  if (!liste) return;
  let items=lieuxCarte;
  if (filtreCarteAgent==='urgence') items=items.filter(i=>i.urgences);
  else if (filtreCarteAgent==='pharmacie') items=items.filter(i=>i.type==='Pharmacie');
  else if (filtreCarteAgent!=='tous') items=items.filter(i=>i.type===filtreCarteAgent);
  const icones={CHU:'🏛️',CHR:'🏥',CMA:'🏨',CSPS:'🏠',Clinique:'🏩',Pharmacie:'💊'};
  liste.innerHTML=items.slice(0,15).map(i=>`
    <div style="background:var(--fond-carte);border-radius:12px;padding:12px;margin-bottom:8px;box-shadow:var(--shadow-sm);display:flex;gap:12px">
      <div style="font-size:1.5rem">${icones[i.type]||'🏥'}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${i.nom}</div>
        <div style="font-size:11px;color:var(--texte-doux)">${i.type}${i.urgences?' · 🚨 Urgences':''}</div>
        ${i.horaires?`<div style="font-size:11px;color:var(--texte-doux)">⏰ ${i.horaires}</div>`:''}
        <div style="display:flex;gap:8px;margin-top:6px">
          ${i.telephone?`<a href="tel:${i.telephone}" style="font-size:11px;padding:3px 10px;background:var(--vert-clair);color:var(--vert-clinique);border-radius:20px;font-weight:600;text-decoration:none">📞</a>`:''}
          <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${i.lat},${i.lng}','_blank')" style="font-size:11px;padding:3px 10px;background:var(--orange-clair);color:#B87A00;border:none;border-radius:20px;cursor:pointer">🗺️</button>
        </div>
      </div>
    </div>`).join('');
}

window.filtrerCarte = function(type,btn) {
  filtreCarteAgent=type;
  document.querySelectorAll('.filtre-btn').forEach(b=>b.classList.remove('actif'));
  if (btn) btn.classList.add('actif');
  afficherListeCentresAgent();
};

// ---- RAPPELS ----
async function chargerRappels() {
  const liste=document.getElementById('liste-rappels');
  const badge=document.getElementById('badge-rappels');
  try {
    const data=await Api.requete('GET','/dashboard/rappels');
    const rappels=data.data?.rappels||[];
    if (badge) badge.textContent=rappels.length;
    if (!liste) return;
    if (!rappels.length) { liste.innerHTML='<div class="etat-vide">Aucun rappel cette semaine</div>'; return; }
    liste.innerHTML=rappels.map(r=>{
      const date=r.prochain_rappel?new Date(r.prochain_rappel).toLocaleDateString('fr-FR'):'—';
      const diff=r.prochain_rappel?Math.ceil((new Date(r.prochain_rappel)-new Date())/(1000*60*60*24)):999;
      const statut=diff<=2?'urgent':'normal';
      return `<div class="rappel-item">
        <div class="rappel-icone">💉</div>
        <div class="rappel-info"><div class="rappel-nom">${r.vaccin_nom} · ${r.prenom||''} ${r.nom||''}</div><div class="rappel-date">${date} · ${r.telephone||'—'}</div></div>
        <span class="rappel-statut ${statut}">${diff<0?'Retard':diff===0?"Auj.":date}</span>
      </div>`;
    }).join('');
  } catch(e) { if (liste) liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

// ---- TRADUCTION ----
let langueTraduction='moore';
let timerTrad=null;

window.changerLangueTrad = function(btn) {
  document.querySelectorAll('.langue-btn').forEach(b=>b.classList.remove('actif'));
  btn.classList.add('actif');
  langueTraduction=btn.dataset.langue;
  const terme=document.getElementById('search-traduction')?.value;
  if (terme) traduire(terme);
};

window.traduire = function(terme) {
  clearTimeout(timerTrad);
  timerTrad=setTimeout(async()=>{
    const res=document.getElementById('resultats-traduction');
    if (!terme||terme.length<2) { if(res) res.innerHTML='<div class="etat-vide">🌍 Tapez un terme pour traduire</div>'; return; }
    try {
      const data=await Api.requete('GET',`/traduction/rechercher?terme=${encodeURIComponent(terme)}&langue=${langueTraduction}`);
      const resultats=data.data?.resultats||[];
      if (!resultats.length) { if(res) res.innerHTML=`<div class="etat-vide">Terme "${terme}" non trouvé</div>`; return; }
      if (res) res.innerHTML=resultats.map(r=>`
        <div class="traduction-carte">
          <div class="traduction-terme-fr">🇫🇷 ${r.terme_fr||terme}</div>
          <div class="traduction-terme-local">${r.traduction||'—'}</div>
          <button onclick="window.SyntheseVocale?.parler('${r.traduction}','${langueTraduction}')" style="margin-top:8px;background:var(--vert-clair);border:none;border-radius:8px;padding:6px 12px;color:var(--vert-clinique);cursor:pointer;font-size:12px">🔊 Écouter</button>
        </div>`).join('');
    } catch(e) { if(res) res.innerHTML='<div class="etat-vide">Erreur de traduction</div>'; }
  },400);
};

// ---- DECONNEXION ----
document.getElementById('btn-deconnexion')?.addEventListener('click', async()=>{
  if (!confirm('Se déconnecter ?')) return;
  if (videoStream) videoStream.getTracks().forEach(t=>t.stop());
  await Api.deconnexion();
  window.location.href='/';
});

// ---- INIT ----
async function init() {
  const user=Api.getUtilisateur();
  if (!user) { window.location.href='/'; return; }
  const nomEl=document.getElementById('dash-nom');
  if (nomEl) nomEl.textContent=`${user.prenom||''} ${user.nom||''}`.trim()||'—';
  afficherDate();
  mettreAJourStatut();
  await Promise.allSettled([
    chargerPatients(),
    chargerRappels(),
    (async()=>{
      try {
        const s=await Api.requete('GET','/dashboard/stats');
        const d=s.data||{};
        const v=document.getElementById('stat-vaccins');
        if (v) v.textContent=d.vaccinations||0;
        const a=document.getElementById('stat-alertes');
        if (a) a.textContent=d.alertes_actives||0;
      } catch(e) {}
    })()
  ]);
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (!Api.estConnecte()) { window.location.href='/'; return; }
  const user = Api.getUtilisateur();
  if (!user || !['agent','agent_sante'].includes(user.role)) {
    Api.deconnexion();
    window.location.href='/';
    return;
  }
  init();
});

// ---- TELEMÉDECINE AGENT ----
let demandeAgentActiveId = null;
let demandeAgentPatientId = null;

window.chargerDemandesAgent = async function() {
  const liste = document.getElementById('liste-demandes-agent');
  const badge = document.getElementById('badge-demandes');
  try {
    const data = await Api.requete('GET', '/telemedecine/demandes/en-attente');
    const demandes = data.data?.demandes || [];
    if (badge) badge.textContent = demandes.length;
    if (!liste) return;
    if (!demandes.length) {
      liste.innerHTML = '<div class="etat-vide">Aucune demande en attente</div>';
      return;
    }
    liste.innerHTML = demandes.map(d => {
      const urgenceCouleur = d.urgence === 'urgente' ? '#D94F4F' : '#F2A640';
      const age = d.date_naissance ? Math.floor((new Date()-new Date(d.date_naissance))/(365.25*24*60*60*1000)) : '?';
      return `<div style="background:var(--fond-carte);border-radius:12px;padding:14px;margin-bottom:8px;box-shadow:var(--shadow-sm);border-left:4px solid ${urgenceCouleur}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700;font-size:14px">${d.patient_prenom} ${d.patient_nom}</div>
          <span style="font-size:11px;padding:2px 8px;background:${urgenceCouleur};color:#fff;border-radius:20px">${d.urgence}</span>
        </div>
        <div style="font-size:12px;color:var(--texte-doux);margin-top:2px">${age} ans · ${d.patient_telephone||'—'} · ${d.groupe_sanguin||'—'}</div>
        ${d.allergies?`<div style="font-size:11px;color:var(--rouge-alerte)">⚠️ Allergies: ${d.allergies}</div>`:''}
        <div style="font-size:13px;margin-top:8px;color:var(--texte-principal)"><strong>Motif:</strong> ${d.motif}</div>
        ${d.symptomes?`<div style="font-size:12px;color:var(--texte-secondaire);margin-top:4px">${d.symptomes}</div>`:''}
        <div style="font-size:11px;color:var(--texte-doux);margin-top:4px">${new Date(d.created_at).toLocaleString('fr-FR')}</div>
        <div style="display:flex;gap:8px;margin-top:10px">
          ${d.statut==='en_attente'?`<button onclick="prendreEnCharge('${d.id}','${d.patient_prenom} ${d.patient_nom}','${d.patient_id}')" style="flex:1;background:var(--vert-clinique);border:none;border-radius:8px;padding:8px;color:#fff;cursor:pointer;font-size:13px;font-weight:600">Prendre en charge</button>`:''}
          <button onclick="ouvrirMessagerieAgent('${d.id}','${d.patient_prenom} ${d.patient_nom}','${d.patient_id}')" style="flex:1;background:var(--bleu-nuit);border:none;border-radius:8px;padding:8px;color:#fff;cursor:pointer;font-size:13px">Voir messages (${d.nb_messages||0})</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    if (liste) liste.innerHTML = '<div class="etat-vide">Erreur: ' + e.message + '</div>';
  }
};

window.prendreEnCharge = async function(demandeId, patientNom, patientId) {
  afficherLoading('Prise en charge...');
  try {
    await Api.requete('PUT', `/telemedecine/demandes/${demandeId}/prendre-charge`);
    cacherLoading();
    ouvrirMessagerieAgent(demandeId, patientNom, patientId);
  } catch(e) {
    cacherLoading();
    alert('Erreur: ' + e.message);
  }
};

window.ouvrirMessagerieAgent = async function(demandeId, patientNom, patientId) {
  demandeAgentActiveId = demandeId;
  demandeAgentPatientId = patientId;
  const titre = document.getElementById('messagerie-agent-titre');
  if (titre) titre.textContent = patientNom || 'Consultation';
  const info = document.getElementById('patient-info-msg');
  if (info) info.innerHTML = `<div style="font-size:13px;color:var(--vert-clinique);font-weight:600">Patient: ${patientNom}</div><button onclick="voirDossier('${patientId}')" style="font-size:11px;background:var(--vert-clinique);border:none;border-radius:6px;padding:4px 10px;color:#fff;cursor:pointer;margin-top:4px">Voir dossier complet</button>`;
  allerPage('messagerie-agent');
  await chargerMessagesAgent();
};

window.chargerMessagesAgent = async function() {
  if (!demandeAgentActiveId) return;
  const liste = document.getElementById('liste-messages-agent');
  try {
    const data = await Api.requete('GET', `/telemedecine/demandes/${demandeAgentActiveId}/messages`);
    const messages = data.data?.messages || [];
    if (!liste) return;
    if (!messages.length) {
      liste.innerHTML = '<div class="etat-vide" style="padding:20px;text-align:center">Aucun message</div>';
      return;
    }
    liste.innerHTML = messages.map(m => {
      const estAgent = m.expediteur_type === 'agent';
      const couleur = estAgent ? 'var(--vert-clinique)' : 'var(--bleu-nuit)';
      const fond = estAgent ? 'var(--vert-clair)' : '#EEF6FF';
      const align = estAgent ? 'flex-end' : 'flex-start';
      return `<div style="display:flex;justify-content:${align};margin:8px 12px">
        <div style="max-width:75%;background:${fond};border-radius:12px;padding:10px 14px">
          <div style="font-size:11px;color:${couleur};font-weight:600;margin-bottom:4px">${estAgent ? 'Vous' : 'Patient'}</div>
          <div style="font-size:13px;color:var(--texte-principal)">${m.contenu}</div>
          <div style="font-size:10px;color:var(--texte-doux);margin-top:4px;text-align:right">${new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      </div>`;
    }).join('');
    liste.scrollTop = liste.scrollHeight;
  } catch(e) {
    if (liste) liste.innerHTML = '<div class="etat-vide">Erreur: ' + e.message + '</div>';
  }
};

window.envoyerMessageAgent = async function() {
  if (!demandeAgentActiveId) return;
  const input = document.getElementById('input-message-agent');
  const contenu = input?.value.trim();
  if (!contenu) return;
  try {
    await Api.requete('POST', `/telemedecine/demandes/${demandeAgentActiveId}/messages`, { contenu });
    if (input) input.value = '';
    await chargerMessagesAgent();
  } catch(e) { alert('Erreur: ' + e.message); }
};

window.ouvrirFormOrdonnance = function() {
  const dateEl = document.getElementById('ord-validite');
  if (dateEl) {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    dateEl.value = d.toISOString().split('T')[0];
  }
  ouvrirModal('modal-ordonnance');
};

window.soumettraOrdonnance = async function() {
  if (!demandeAgentActiveId) return;
  const medicamentsTexte = document.getElementById('ord-medicaments')?.value.trim();
  const instructions = document.getElementById('ord-instructions')?.value.trim();
  const instructions_moore = document.getElementById('ord-moore')?.value.trim();
  const instructions_dioula = document.getElementById('ord-dioula')?.value.trim();
  const valide_jusqu_au = document.getElementById('ord-validite')?.value;
  const alerte = document.getElementById('alerte-ordonnance');

  if (!medicamentsTexte || !instructions) {
    if (alerte) { alerte.textContent = 'Medicaments et instructions requis'; alerte.className = 'alerte visible erreur'; }
    return;
  }

  const medicaments = medicamentsTexte.split('\n').map(l => l.trim()).filter(Boolean);
  afficherLoading('Envoi ordonnance...');
  try {
    await Api.requete('POST', `/telemedecine/demandes/${demandeAgentActiveId}/ordonnance`, {
      medicaments, instructions, instructions_moore, instructions_dioula, valide_jusqu_au
    });
    cacherLoading();
    fermerModal('modal-ordonnance');
    if (alerte) alerte.textContent = '';
    await chargerMessagesAgent();
    await chargerDemandesAgent();
  } catch(e) {
    cacherLoading();
    if (alerte) { alerte.textContent = e.message || 'Erreur'; alerte.className = 'alerte visible erreur'; }
  }
};

window.cloturerConsultation = async function() {
  if (!demandeAgentActiveId || !confirm('Cloturer cette consultation ?')) return;
  afficherLoading('Cloture...');
  try {
    await Api.requete('PUT', `/telemedecine/demandes/${demandeAgentActiveId}/cloturer`);
    cacherLoading();
    allerPage('telemédecine');
    await chargerDemandesAgent();
  } catch(e) { cacherLoading(); alert('Erreur: ' + e.message); }
};

// Auto-refresh messages agent toutes les 10 secondes
setInterval(async () => {
  const pageMsg = document.getElementById('page-messagerie-agent');
  if (pageMsg && pageMsg.classList.contains('active') && demandeAgentActiveId) {
    await chargerMessagesAgent();
  }
}, 10000);

// ---- SUIVI GROSSESSE AGENT ----
window.chargerGrossessesAgent = async function() {
  const liste = document.getElementById('liste-grossesses-agent');
  const badge = document.getElementById('badge-grossesses');
  try {
    const data = await Api.requete('GET', '/grossesse/liste');
    const grossesses = data.data?.grossesses || [];
    if (badge) badge.textContent = grossesses.length;
    if (!liste) return;
    if (!grossesses.length) {
      liste.innerHTML = '<div class="etat-vide">Aucune grossesse en cours</div>';
      return;
    }
    liste.innerHTML = grossesses.map(g => {
      const semaine = Math.floor((new Date() - new Date(g.date_dernieres_regles)) / (7*24*60*60*1000));
      const dda = new Date(g.date_accouchement_prevue).toLocaleDateString('fr-FR');
      const cpnFaites = parseInt(g.cpn_effectuees || 0);
      const urgente = semaine > 36 && cpnFaites < 6;
      return `<div style="background:var(--fond-carte);border-radius:12px;padding:14px;margin-bottom:8px;box-shadow:var(--shadow-sm);border-left:4px solid ${urgente?'#D94F4F':'#E91E63'}">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-weight:700;font-size:14px">${g.prenom} ${g.nom}</div>
          <span style="font-size:11px;padding:2px 8px;background:${urgente?'#FDE8E8':'#FCE4EC'};color:${urgente?'#D94F4F':'#E91E63'};border-radius:20px">SA ${semaine}</span>
        </div>
        <div style="font-size:12px;color:var(--texte-doux);margin-top:2px">${g.telephone||'—'}</div>
        <div style="font-size:12px;margin-top:6px">
          <span style="color:#E91E63">🤱 Accouchement prevu: ${dda}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
          <div style="flex:1;background:var(--bordure);border-radius:9999px;height:6px">
            <div style="background:#E91E63;border-radius:9999px;height:6px;width:${Math.min(100,Math.round(cpnFaites/8*100))}%"></div>
          </div>
          <span style="font-size:11px;color:var(--texte-doux)">${cpnFaites}/8 CPN</span>
        </div>
        ${urgente?'<div style="font-size:11px;color:#D94F4F;margin-top:4px">⚠️ Attention: terme proche, CPN insuffisantes</div>':''}
        <div style="display:flex;gap:8px;margin-top:10px">
          <button onclick="ouvrirCPN('${g.id}',${cpnFaites+1})" style="flex:1;background:#E91E63;border:none;border-radius:8px;padding:8px;color:#fff;cursor:pointer;font-size:13px;font-weight:600">+ CPN ${cpnFaites+1}</button>
          <button onclick="voirDossier('${g.patient_id}')" style="flex:1;background:var(--bleu-nuit);border:none;border-radius:8px;padding:8px;color:#fff;cursor:pointer;font-size:13px">Dossier</button>
        </div>
      </div>`;
    }).join('');
  } catch(e) {
    if (liste) liste.innerHTML = '<div class="etat-vide">Erreur: ' + e.message + '</div>';
  }
};

window.ouvrirCPN = function(grossesseId, numeroCPN) {
  document.getElementById('cpn-grossesse-id').value = grossesseId;
  const numEl = document.getElementById('cpn-numero');
  if (numEl) numEl.value = Math.min(8, numeroCPN);
  const dateEl = document.getElementById('cpn-date');
  if (dateEl) dateEl.value = new Date().toISOString().split('T')[0];
  allerPage('cpn');
};

window.soumettreCPN = async function() {
  const grossesse_id = document.getElementById('cpn-grossesse-id')?.value;
  const numero_cpn = document.getElementById('cpn-numero')?.value;
  const date_cpn = document.getElementById('cpn-date')?.value;
  const poids = document.getElementById('cpn-poids')?.value;
  const tension_arterielle = document.getElementById('cpn-tension')?.value;
  const hauteur_uterine = document.getElementById('cpn-hu')?.value;
  const fcf = document.getElementById('cpn-fcf')?.value;
  const position_foetus = document.getElementById('cpn-position')?.value;
  const observations = document.getElementById('cpn-observations')?.value;
  const prochaine_cpn = document.getElementById('cpn-prochaine')?.value;
  const alerte = document.getElementById('alerte-cpn');

  if (!grossesse_id || !numero_cpn || !date_cpn) {
    if (alerte) { alerte.textContent = 'Champs obligatoires manquants'; alerte.className = 'alerte visible erreur'; }
    return;
  }

  afficherLoading('Enregistrement CPN...');
  try {
    await Api.requete('POST', '/grossesse/cpn', {
      grossesse_id, numero_cpn: parseInt(numero_cpn), date_cpn,
      poids: poids ? parseFloat(poids) : null,
      tension_arterielle, hauteur_uterine: hauteur_uterine ? parseFloat(hauteur_uterine) : null,
      fcf: fcf ? parseInt(fcf) : null, position_foetus, observations, prochaine_cpn
    });
    cacherLoading();
    if (alerte) { alerte.textContent = 'CPN enregistree avec succes !'; alerte.className = 'alerte visible succes'; }
    setTimeout(() => { allerPage('grossesse'); chargerGrossessesAgent(); }, 1500);
  } catch(e) {
    cacherLoading();
    if (alerte) { alerte.textContent = e.message || 'Erreur'; alerte.className = 'alerte visible erreur'; }
  }
};

// ---- MENU HAMBURGER AGENT ----
window.toggleMenuAgent = function() {
  const menu = document.getElementById('menu-agent');
  const overlay = document.getElementById('overlay-agent');
  const ouvert = menu.style.right === '0px';
  menu.style.right = ouvert ? '-280px' : '0px';
  overlay.style.display = ouvert ? 'none' : 'block';
};

window.fermerMenuAgent = function() {
  const menu = document.getElementById('menu-agent');
  const overlay = document.getElementById('overlay-agent');
  if (menu) menu.style.right = '-280px';
  if (overlay) overlay.style.display = 'none';
};

window.allerPageAgent = function(page) {
  fermerMenuAgent();
  allerPage(page);
  document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('actif'));
  const actif = document.querySelector(`.menu-item[data-page="${page}"]`);
  if (actif) actif.classList.add('actif');
  const nomEl = document.getElementById('agent-menu-nom');
  const user = Api.getUtilisateur();
  if (nomEl && user) nomEl.textContent = user.prenom + ' ' + user.nom;
};
