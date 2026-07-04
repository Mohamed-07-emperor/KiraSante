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

// ---- UTILS ----
function afficherLoading(msg) {
  const o=document.getElementById('loading-overlay'), t=document.getElementById('loading-texte');
  if (o) o.classList.add('visible'); if (t) t.textContent=msg||'Chargement…';
}
function cacherLoading() { const o=document.getElementById('loading-overlay'); if (o) o.classList.remove('visible'); }
function set(id,val) { const e=document.getElementById(id); if (e) e.textContent=val??'—'; }
window.fermerModalAdmin = function() { const m=document.getElementById('modal-dossier-admin'); if(m) m.classList.remove('visible'); };

// ---- NAVIGATION ----
let carteAdminInit = false;
let mapAdmin = null;
let lieuxAdmin = [];
let filtreAdmin = 'tous';
let tousAgents = [];
let tousPatientsAdmin = [];

window.allerPage = function(page) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.remove('actif'));
  const pageEl=document.getElementById('page-'+page);
  if (pageEl) pageEl.classList.add('active');
  const navEl=document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('actif');
  if (page==='patients') chargerPatientsAdmin();
  if (page==='agents') chargerAgents();
  if (page==='alertes') chargerAlertesAdmin();
  if (page==='carte' && !carteAdminInit) { initCarteAdmin(); carteAdminInit=true; }
  if (page==='export') chargerEvolution();
};

// ---- STATS ----
async function chargerStats() {
  try {
    const data = await Api.requete('GET','/dashboard/stats');
    const s = data.data||{};
    set('g-patients',s.patients); set('g-consultations',s.consultations);
    set('g-agents',s.agents_actifs); set('g-alertes',s.alertes_actives);
    set('t-consultations',s.consultations_aujourd_hui);
    set('t-patients',s.nouveaux_patients_semaine);
    set('t-vaccinations',s.vaccinations);
  } catch(e) { console.error('Stats:',e); }
}

// ---- SYMPTOMES ----
async function chargerSymptomes() {
  const liste=document.getElementById('liste-symptomes');
  try {
    const data=await Api.requete('GET','/dashboard/symptomes');
    const symptomes=data.data?.symptomes||[];
    if (!liste) return;
    if (!symptomes.length) { liste.innerHTML='<div class="etat-vide">Aucun symptôme ce mois</div>'; return; }
    const max=Math.max(...symptomes.map(s=>parseInt(s.occurrences)));
    liste.innerHTML=symptomes.map(s=>{
      const pct=Math.round((parseInt(s.occurrences)/max)*100);
      return `<div class="symptome-item">
        <span class="symptome-nom">${s.symptome}</span>
        <div class="symptome-barre-container"><div class="symptome-barre" style="width:${pct}%"></div></div>
        <span class="symptome-count">${s.occurrences}</span>
      </div>`;
    }).join('');
  } catch(e) { if(liste) liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

// ---- RAPPELS ----
async function chargerRappels() {
  const liste=document.getElementById('liste-rappels'), badge=document.getElementById('badge-rappels');
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
        <div class="rappel-info">
          <div class="rappel-nom">${r.vaccin_nom} · ${r.prenom||''} ${r.nom||''}</div>
          <div class="rappel-date">${date} · ${r.telephone||'—'} · ${r.district_nom||'—'}</div>
        </div>
        <span class="rappel-statut ${statut}">${diff<0?'Retard':date}</span>
      </div>`;
    }).join('');
  } catch(e) { if(liste) liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

// ---- PATIENTS ADMIN ----
async function chargerPatientsAdmin() {
  const liste=document.getElementById('liste-patients-admin');
  try {
    const data=await Api.requete('GET','/patients');
    tousPatientsAdmin=data.data?.patients||[];
    afficherPatientsAdmin(tousPatientsAdmin);
  } catch(e) { if(liste) liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

function afficherPatientsAdmin(patients) {
  const liste=document.getElementById('liste-patients-admin');
  if (!liste) return;
  if (!patients.length) { liste.innerHTML='<div class="etat-vide">Aucun patient</div>'; return; }
  liste.innerHTML=patients.map(p=>{
    const ini=`${(p.prenom||'?')[0]}${(p.nom||'?')[0]}`.toUpperCase();
    const age=p.date_naissance?Math.floor((new Date()-new Date(p.date_naissance))/(365.25*24*60*60*1000)):'?';
    return `<div class="patient-item" onclick="voirDossierAdmin('${p.id}')">
      <div class="patient-avatar">${ini}</div>
      <div class="patient-info">
        <div class="patient-nom">${p.prenom} ${p.nom}</div>
        <div class="patient-details">${age} ans · ${p.telephone||'—'} · ${p.groupe_sanguin||'—'}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg>
    </div>`;
  }).join('');
}

window.filtrerPatientsAdmin = function(terme) {
  if (!terme) { afficherPatientsAdmin(tousPatientsAdmin); return; }
  const t=terme.toLowerCase();
  afficherPatientsAdmin(tousPatientsAdmin.filter(p=>`${p.prenom} ${p.nom}`.toLowerCase().includes(t)||(p.telephone||'').includes(t)));
};

window.voirDossierAdmin = async function(patientId) {
  const modal=document.getElementById('modal-dossier-admin');
  if (modal) modal.classList.add('visible');
  const contenu=document.getElementById('contenu-dossier-admin');
  if (contenu) contenu.innerHTML='<div class="etat-chargement"><div class="loading-ecg"></div></div>';
  try {
    const [patRes,consRes,vaccRes,grossRes]=await Promise.allSettled([
      Api.requete('GET',`/dossier/patient/${patientId}`),
      Api.requete('GET',`/consultations/patient/${patientId}`),
      Api.requete('GET',`/vaccinations/patient/${patientId}`),
      Api.requete('GET',`/grossesse/ma-grossesse`).catch(()=>null)
    ]);
    const p=patRes.value?.data||{};
    const cons=consRes.value?.data?.consultations||[];
    const vacc=vaccRes.value?.data?.vaccinations||[];
    const age=p.date_naissance?Math.floor((new Date()-new Date(p.date_naissance))/(365.25*24*60*60*1000)):'?';
    document.getElementById('dossier-admin-titre').textContent=`${p.prenom||''} ${p.nom||''}`;
    if (contenu) contenu.innerHTML=`
      <div style="display:flex;align-items:center;gap:16px;padding:12px;background:var(--vert-clair);border-radius:12px;margin-bottom:12px">
        ${p.qrDataURL?`<img src="${p.qrDataURL}" width="80" height="80" style="border-radius:8px" />`:'<div style="width:80px;height:80px;background:var(--bordure);border-radius:8px;display:flex;align-items:center;justify-content:center">📋</div>'}
        <div><div style="font-family:var(--font-mono);font-size:13px;color:var(--vert-clinique);font-weight:600">${p.qr_code||'—'}</div><div style="font-size:11px;color:var(--texte-doux)">ID Patient KiraSante</div></div>
      </div>
      <div class="dossier-grid" style="margin-bottom:16px">
        <div class="dossier-champ"><span class="dossier-label">Prénom</span><span class="dossier-valeur">${p.prenom||'—'}</span></div>
        <div class="dossier-champ"><span class="dossier-label">Nom</span><span class="dossier-valeur">${p.nom||'—'}</span></div>
        <div class="dossier-champ"><span class="dossier-label">Âge</span><span class="dossier-valeur">${age} ans</span></div>
        <div class="dossier-champ"><span class="dossier-label">Sexe</span><span class="dossier-valeur">${p.sexe==='M'?'Homme':'Femme'}</span></div>
        <div class="dossier-champ"><span class="dossier-label">Groupe sanguin</span><span class="dossier-valeur">${p.groupe_sanguin||'—'}</span></div>
        <div class="dossier-champ"><span class="dossier-label">Téléphone</span><span class="dossier-valeur">${p.telephone||'—'}</span></div>
        <div class="dossier-champ" style="grid-column:span 2"><span class="dossier-label">Allergies</span><span class="dossier-valeur">${p.allergies||'Aucune'}</span></div>
      </div>
      <div style="font-weight:600;font-size:13px;color:var(--texte-doux);margin-bottom:8px">CONSULTATIONS (${cons.length})</div>
      ${cons.length?cons.slice(0,5).map(c=>`<div style="border-left:3px solid var(--vert-clinique);padding:8px 12px;margin-bottom:6px;background:var(--fond-chaud);border-radius:0 8px 8px 0"><div style="font-weight:600;font-size:13px">${c.motif||'Consultation'}</div><div style="font-size:11px;color:var(--texte-doux)">${new Date(c.date_consultation||c.created_at).toLocaleDateString('fr-FR')}</div>${c.diagnostic?`<div style="font-size:12px">${c.diagnostic}</div>`:''}</div>`).join(''):'<div class="etat-vide">Aucune consultation</div>'}
      <div style="font-weight:600;font-size:13px;color:var(--texte-doux);margin:12px 0 8px">VACCINATIONS (${vacc.length})</div>
      ${vacc.length?vacc.map(v=>`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--bordure)"><span>💉</span><div><div style="font-weight:600;font-size:13px">${v.vaccin_nom}</div><div style="font-size:11px;color:var(--texte-doux)">${new Date(v.date_admin).toLocaleDateString('fr-FR')}</div></div></div>`).join(''):'<div class="etat-vide">Aucune vaccination</div>'}
      <div style="display:flex;gap:8px;margin-top:16px">
        <button class="btn-primaire" onclick="exporterPDF('${patientId}')">📄 Export PDF</button>
      </div>`;
  } catch(e) { if(contenu) contenu.innerHTML='<div class="etat-vide">Erreur</div>'; }
};

window.exporterPDF = async function(patientId) {
  afficherLoading('Génération PDF…');
  try {
    window.open(`/api/v1/export/pdf/patient/${patientId}?token=${Api.getToken()}`, '_blank');
    cacherLoading();
  } catch(e) { cacherLoading(); }
};

// ---- AGENTS ----
async function chargerAgents() {
  const liste=document.getElementById('liste-agents');
  try {
    const data=await Api.requete('GET','/dashboard/stats');
    const patientsData=await Api.requete('GET','/patients');
    const agents=await Api.requete('GET','/districts');
    if (!liste) return;
    const total=data.data?.agents_actifs||0;
    liste.innerHTML=`
      <div class="section-bloc" style="margin-bottom:12px">
        <div style="text-align:center;padding:16px">
          <div style="font-family:var(--font-display);font-size:3rem;font-weight:700;color:var(--vert-clinique)">${total}</div>
          <div style="font-size:14px;color:var(--texte-doux)">Agents de santé actifs</div>
        </div>
      </div>
      <div class="section-bloc">
        <div class="bloc-header"><h2 class="bloc-titre">Districts</h2></div>
        ${(agents.data?.districts||[]).map(d=>`
          <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--bordure)">
            <div style="font-size:1.5rem">🏥</div>
            <div style="flex:1">
              <div style="font-weight:600;font-size:13px">${d.nom}</div>
              <div style="font-size:11px;color:var(--texte-doux)">${d.region} · ${d.population?.toLocaleString()||'—'} hab.</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="section-bloc" style="margin-top:12px">
        <div class="bloc-header"><h2 class="bloc-titre">Recherche agent</h2></div>
        <div class="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/></svg>
          <input type="tel" id="search-agent-tel" placeholder="+22670000000" />
          <button onclick="rechercherParTel()" style="background:var(--vert-clinique);border:none;border-radius:8px;padding:6px 12px;color:#fff;cursor:pointer;font-size:12px">→</button>
        </div>
        <div id="resultat-agent-search"></div>
      </div>`;
  } catch(e) { if(liste) liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

window.rechercherParTel = async function() {
  const tel=document.getElementById('search-agent-tel')?.value.trim();
  const res=document.getElementById('resultat-agent-search');
  if (!tel||!res) return;
  try {
    const data=await Api.requete('GET',`/recherche/patients/tel/${encodeURIComponent(tel)}`);
    const p=data.data?.patient||data.data;
    if (p?.id) {
      res.innerHTML=`<div style="background:var(--vert-clair);border-radius:8px;padding:12px;margin-top:8px">
        <div style="font-weight:600">${p.prenom} ${p.nom}</div>
        <div style="font-size:12px;color:var(--texte-doux)">${p.telephone||'—'}</div>
        <button class="btn-primaire" style="margin-top:8px" onclick="voirDossierAdmin('${p.id}')">Voir dossier</button>
      </div>`;
    } else {
      res.innerHTML='<div style="color:var(--rouge-alerte);font-size:13px;margin-top:8px">Aucun patient trouvé</div>';
    }
  } catch(e) { if(res) res.innerHTML='<div style="color:var(--rouge-alerte);font-size:13px;margin-top:8px">Erreur de recherche</div>'; }
};

// ---- ALERTES ADMIN ----
async function chargerAlertesAdmin() {
  const liste=document.getElementById('liste-alertes-admin');
  try {
    const data=await Api.requete('GET','/alertes');
    const alertes=data.data?.alertes||[];
    if (!liste) return;
    if (!alertes.length) { liste.innerHTML='<div class="etat-vide">✅ Aucune alerte active</div>'; return; }
    liste.innerHTML=alertes.map(a=>`
      <div class="alerte-admin-item" id="alerte-${a.id}">
        <div class="alerte-admin-titre">⚠️ ${a.type_alerte||'Alerte sanitaire'}</div>
        <div class="alerte-admin-details">${a.nombre_cas||0} cas · ${new Date(a.date_detection||a.created_at).toLocaleDateString('fr-FR')}</div>
        <div class="alerte-admin-footer">
          <span class="alerte-statut ${a.statut||'active'}">${a.statut==='resolue'?'Résolue':'Active'}</span>
          ${a.statut!=='resolue'?`<button class="btn-resoudre" onclick="resoudreAlerte('${a.id}')">✅ Résoudre</button>`:''}
        </div>
      </div>`).join('');
  } catch(e) { if(liste) liste.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

window.resoudreAlerte = async function(id) {
  try {
    await Api.requete('PUT',`/alertes/${id}/resoudre`);
    chargerAlertesAdmin();
  } catch(e) { alert('Erreur: '+e.message); }
};

// ---- CARTE ADMIN ----
async function initCarteAdmin() {
  try {
    const [structRes,distRes]=await Promise.allSettled([
      fetch('/data/structures-sante.json').then(r=>r.json()),
      Api.requete('GET','/dashboard/districts')
    ]);
    const structures=structRes.value||{centres:[],pharmacies:[]};
    lieuxAdmin=[...structures.centres,...structures.pharmacies.map(p=>({...p,type:'Pharmacie'}))];
    const districts=distRes.value?.data?.districts||[];

    mapAdmin=L.map('map').setView([12.3667,-1.5333],7);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18}).addTo(mapAdmin);

    const coords={'District de Ouagadougou':[12.3667,-1.5333],'District de Bobo-Dioulasso':[11.1771,-4.2979],'District de Koudougou':[12.25,-2.3667],'District de Ouahigouya':[13.5667,-2.4167],'District de Banfora':[10.6333,-4.7667],'District de Kaya':[13.1,-1.0833]};

    districts.forEach(d=>{
      const c=coords[d.nom]||[12.3667+Math.random()*2-1,-1.5333+Math.random()*2-1];
      const couleur=parseInt(d.alertes_actives)>0?'#D94F4F':parseInt(d.total_patients)>50?'#F2A640':'#0F6E5C';
      L.circleMarker(c,{radius:Math.max(8,Math.min(25,8+parseInt(d.total_patients||0)/8)),fillColor:couleur,color:'#fff',weight:2,fillOpacity:0.8})
        .addTo(mapAdmin)
        .bindPopup(`<strong>${d.nom}</strong><br>👥 ${d.total_patients||0} patients<br>🏥 ${d.total_consultations||0} consultations<br>${parseInt(d.alertes_actives)>0?'<span style="color:#D94F4F">⚠️ Alerte active</span>':'✅ OK'}`);
    });

    L.marker([12.3667,-1.5333]).addTo(mapAdmin).bindPopup('<strong>Ouagadougou</strong>').openPopup();
    afficherListeCentresAdmin();
    afficherDistrictsAdmin(districts);
  } catch(e) { console.error('Carte admin:',e); }
}

function afficherDistrictsAdmin(districts) {
  const liste=document.getElementById('liste-districts');
  if (!liste) return;
  liste.innerHTML=districts.map(d=>`
    <div class="district-item">
      <div class="district-icone">🏥</div>
      <div class="district-info">
        <div class="district-nom">${d.nom}</div>
        <div class="district-stats">${d.total_patients||0} patients · ${d.total_consultations||0} consultations</div>
      </div>
      ${parseInt(d.alertes_actives)>0?`<span class="district-alertes">⚠️ ${d.alertes_actives}</span>`:'<span style="color:var(--vert-clinique);font-size:12px">✅</span>'}
    </div>`).join('');
}

function afficherListeCentresAdmin() {
  const liste=document.getElementById('liste-centres-admin');
  if (!liste) return;
  let items=lieuxAdmin;
  if (filtreAdmin==='urgence') items=items.filter(i=>i.urgences);
  else if (filtreAdmin==='pharmacie') items=items.filter(i=>i.type==='Pharmacie');
  const icones={CHU:'🏛️',CHR:'🏥',CMA:'🏨',CSPS:'🏠',Clinique:'🏩',Pharmacie:'💊'};
  liste.innerHTML=items.slice(0,15).map(i=>`
    <div style="background:var(--fond-chaud);border-radius:8px;padding:10px;margin-bottom:6px;display:flex;gap:10px">
      <div style="font-size:1.2rem">${icones[i.type]||'🏥'}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:13px">${i.nom}</div>
        <div style="font-size:11px;color:var(--texte-doux)">${i.type}${i.urgences?' · 🚨':''}</div>
        ${i.telephone?`<a href="tel:${i.telephone}" style="font-size:11px;color:var(--vert-clinique)">📞 ${i.telephone}</a>`:''}
      </div>
    </div>`).join('');
}

window.filtrerCentresAdmin = function(type,btn) {
  filtreAdmin=type;
  document.querySelectorAll('.filtre-btn').forEach(b=>b.classList.remove('actif'));
  if (btn) btn.classList.add('actif');
  afficherListeCentresAdmin();
};

// ---- EVOLUTION ----
async function chargerEvolution() {
  const chart=document.getElementById('evolution-chart');
  if (!chart) return;
  try {
    const data=await Api.requete('GET','/dashboard/evolution?jours=30');
    const evolution=data.data?.evolution||[];
    if (!evolution.length) { chart.innerHTML='<div class="etat-vide">Aucune donnée</div>'; return; }
    const max=Math.max(...evolution.map(e=>parseInt(e.total)));
    chart.innerHTML=evolution.map(e=>{
      const h=max>0?Math.max(4,Math.round((parseInt(e.total)/max)*160)):4;
      const date=new Date(e.jour).toLocaleDateString('fr-FR',{day:'2-digit',month:'2-digit'});
      return `<div class="chart-bar" style="height:${h}px" title="${date}: ${e.total}"></div>`;
    }).join('');
  } catch(e) { if(chart) chart.innerHTML='<div class="etat-vide">Erreur</div>'; }
}

// ---- EXPORT ----
window.exporterDHIS2 = async function() {
  const debut=document.getElementById('export-debut')?.value;
  const fin=document.getElementById('export-fin')?.value;
  const alerte=document.getElementById('alerte-export');
  afficherLoading('Export DHIS2…');
  try {
    let url='/dhis2/export';
    const params=[];
    if (debut) params.push(`date_debut=${debut}`);
    if (fin) params.push(`date_fin=${fin}`);
    if (params.length) url+='?'+params.join('&');
    const data=await Api.requete('GET',url);
    cacherLoading();
    const json=JSON.stringify(data.data,null,2);
    const blob=new Blob([json],{type:'application/json'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`kirasante-dhis2-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    if (alerte) { alerte.textContent=`✅ Export: ${data.data?.totalPatients||0} patients, ${data.data?.totalConsultations||0} consultations`; alerte.className='alerte visible succes'; }
  } catch(e) { cacherLoading(); if(alerte) { alerte.textContent='Erreur: '+e.message; alerte.className='alerte visible erreur'; } }
};

window.exporterCSV = async function() {
  afficherLoading('Génération CSV…');
  try {
    window.open(`/api/v1/export/csv/patients?token=${Api.getToken()}`, '_blank');
    cacherLoading();
  } catch(e) { cacherLoading(); }
};

// ---- DECONNEXION ----
document.getElementById('btn-deconnexion')?.addEventListener('click', async()=>{
  if (!confirm('Se déconnecter ?')) return;
  await Api.deconnexion();
  window.location.href='/';
});

// ---- INIT ----
async function init() {
  const user=Api.getUtilisateur();
  if (!user) { window.location.href='/'; return; }
  const nomEl=document.getElementById('admin-nom');
  if (nomEl) nomEl.textContent=`Bonjour, ${user.prenom||'Admin'}`;
  afficherDate();
  await Promise.allSettled([chargerStats(), chargerSymptomes(), chargerRappels()]);
}

document.addEventListener('DOMContentLoaded', ()=>{
  if (!Api.estConnecte()) { window.location.href='/'; return; }
  const user = Api.getUtilisateur();
  if (!user || user.role !== 'admin') {
    Api.deconnexion();
    window.location.href='/';
    return;
  }
  init();
});

// ---- MENU HAMBURGER ADMIN ----
window.toggleMenuAdmin = function() {
  const menu = document.getElementById('menu-admin');
  const overlay = document.getElementById('overlay-admin');
  const ouvert = menu.style.right === '0px';
  menu.style.right = ouvert ? '-280px' : '0px';
  overlay.style.display = ouvert ? 'none' : 'block';
};

window.fermerMenuAdmin = function() {
  const menu = document.getElementById('menu-admin');
  const overlay = document.getElementById('overlay-admin');
  if (menu) menu.style.right = '-280px';
  if (overlay) overlay.style.display = 'none';
};

window.allerPageAdmin = function(page) {
  fermerMenuAdmin();
  allerPage(page);
  document.querySelectorAll('.menu-item-admin').forEach(b => b.classList.remove('actif'));
  const actif = document.querySelector(`.menu-item-admin[data-page="${page}"]`);
  if (actif) actif.classList.add('actif');
};
