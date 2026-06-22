if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');

// ---- ECG ANIMATION ----
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

// ---- STATUT ONLINE ----
function mettreAJourStatut() {
  const point = document.getElementById('statut-point');
  if (!point) return;
  if (navigator.onLine) point.classList.add('en-ligne');
  else point.classList.remove('en-ligne');
}
window.addEventListener('online',  mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);

// ---- DATE ----
function afficherDate() {
  const el = document.getElementById('dash-date');
  if (!el) return;
  const now = new Date();
  const jours = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];
  const mois  = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
  el.textContent = `${jours[now.getDay()]} ${now.getDate()} ${mois[now.getMonth()]} ${now.getFullYear()}`;
}

// ---- CALCUL AGE ----
function calculerAge(dateNaissance) {
  if (!dateNaissance) return '—';
  const naissance = new Date(dateNaissance);
  const aujourd = new Date();
  let age = aujourd.getFullYear() - naissance.getFullYear();
  const m = aujourd.getMonth() - naissance.getMonth();
  if (m < 0 || (m === 0 && aujourd.getDate() < naissance.getDate())) age--;
  return age + ' ans';
}

// ---- FORMAT DATE ----
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  const mois = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  return { jour: d.getDate(), mois: mois[d.getMonth()], annee: d.getFullYear() };
}

function formatDateCourte(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('fr-FR');
}

// ---- REMPLIR PROFIL ----
function remplirProfil(user) {
  const nomEl = document.getElementById('dash-nom');
  const idEl  = document.getElementById('patient-id');
  const ageEl = document.getElementById('patient-age');
  const gsEl  = document.getElementById('groupe-sanguin');
  const distEl= document.getElementById('patient-district');

  if (nomEl) nomEl.textContent = `${user.prenom || ''} ${user.nom || ''}`.trim() || '—';
  if (idEl)  idEl.textContent  = user.id ? `KS-${String(user.id).padStart(6,'0')}` : '—';
  if (ageEl) ageEl.textContent = calculerAge(user.date_naissance);
  if (gsEl)  gsEl.textContent  = user.groupe_sanguin || '—';
  if (distEl)distEl.textContent= user.district || user.district_nom || '—';
}

// ---- REMPLIR STATS ----
function remplirStats(consultations, vaccinations, rappels, alertes) {
  const el = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val; };
  el('stat-consultations', consultations ?? '0');
  el('stat-vaccins',       vaccinations  ?? '0');
  el('stat-rappels',       rappels       ?? '0');
  el('stat-alertes',       alertes       ?? '0');
}

// ---- RAPPELS ----
function afficherRappels(rappels) {
  const liste = document.getElementById('liste-rappels');
  const badge = document.getElementById('badge-rappels');
  if (!liste) return;

  const items = Array.isArray(rappels) ? rappels : (rappels?.rappels || []);
  if (badge) badge.textContent = items.length;

  if (items.length === 0) {
    liste.innerHTML = `
      <div class="etat-vide">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
        <span>Aucun rappel vaccinal en attente</span>
      </div>`;
    return;
  }

  liste.innerHTML = items.map(r => {
    const date = formatDateCourte(r.date_prevue || r.date_rappel);
    const maintenant = new Date();
    const dateR = new Date(r.date_prevue || r.date_rappel);
    const diff = Math.ceil((dateR - maintenant) / (1000*60*60*24));
    let statut = 'normal', labelStatut = 'À venir';
    if (diff < 0)  { statut = 'urgent'; labelStatut = 'En retard'; }
    else if (diff <= 7) { statut = 'urgent'; labelStatut = `Dans ${diff}j`; }
    else if (diff <= 30){ statut = 'normal'; labelStatut = `Dans ${diff}j`; }
    else { statut = 'ok'; labelStatut = date; }

    return `
      <div class="rappel-item">
        <div class="rappel-icone">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
          </svg>
        </div>
        <div class="rappel-info">
          <div class="rappel-nom">${r.vaccin || r.nom_vaccin || r.type || 'Vaccin'}</div>
          <div class="rappel-date">${date}</div>
        </div>
        <span class="rappel-statut ${statut}">${labelStatut}</span>
      </div>`;
  }).join('');
}

// ---- CONSULTATIONS ----
function afficherConsultations(consultations) {
  const liste = document.getElementById('liste-consultations');
  if (!liste) return;

  const items = Array.isArray(consultations) ? consultations : (consultations?.consultations || []);
  const recentes = items.slice(0, 5);

  if (recentes.length === 0) {
    liste.innerHTML = `
      <div class="etat-vide">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
        </svg>
        <span>Aucune consultation enregistrée</span>
      </div>`;
    return;
  }

  liste.innerHTML = recentes.map(c => {
    const d = formatDate(c.date_consultation || c.created_at);
    const agent = c.agent_prenom ? `Dr. ${c.agent_prenom} ${c.agent_nom || ''}` : 'Agent de santé';
    const notes = c.notes || c.observations || '';
    return `
      <div class="consultation-item">
        <div class="consultation-date-bloc">
          <span class="consultation-jour">${d.jour}</span>
          <span class="consultation-mois">${d.mois}</span>
        </div>
        <div class="consultation-info">
          <div class="consultation-motif">${c.motif || c.diagnostic || 'Consultation générale'}</div>
          <div class="consultation-agent">${agent}</div>
          ${notes ? `<div class="consultation-notes">${notes.substring(0,80)}${notes.length>80?'…':''}</div>` : ''}
        </div>
      </div>`;
  }).join('');
}

// ---- DÉCONNEXION ----
document.getElementById('btn-deconnexion')?.addEventListener('click', async () => {
  if (!confirm('Se déconnecter ?')) return;
  await Api.deconnexion();
  window.location.href = '/';
});

// ---- NAVIGATION BAS ----
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('actif'));
    btn.classList.add('actif');
    // Navigation future vers d'autres pages
    const page = btn.dataset.page;
    if (page === 'profil') window.location.href = '/profil-patient.html';
  });
});

// ---- CHARGEMENT PRINCIPAL ----
async function chargerDashboard() {
  const user = Api.getUtilisateur();
  if (!user) { window.location.href = '/'; return; }

  // Affichage immédiat du profil depuis le cache
  remplirProfil(user);
  afficherDate();
  mettreAJourStatut();

  try {
    // Chargement parallèle des données
    const [profilData, rappelsData, consultationsData] = await Promise.allSettled([
      Api.profil(),
      Api.requete('GET', '/dashboard/rappels'),
      Api.requete('GET', `/consultations/patient/${user.id}`)
    ]);

    // Profil à jour
    if (profilData.status === 'fulfilled') {
      const u = profilData.value?.utilisateur || profilData.value?.user || profilData.value;
      if (u) { Api.setUtilisateur(u); remplirProfil(u); }
    }

    // Rappels
    const rappels = rappelsData.status === 'fulfilled' ? (rappelsData.value?.rappels || rappelsData.value || []) : [];
    afficherRappels(rappels);

    // Consultations
    const consultations = consultationsData.status === 'fulfilled' ? (consultationsData.value?.consultations || consultationsData.value || []) : [];
    afficherConsultations(consultations);

    // Stats
    remplirStats(
      consultations.length,
      user.vaccinations_count || '—',
      rappels.length,
      user.alertes_count || '0'
    );

  } catch (err) {
    console.error('[KiraSante] Erreur dashboard:', err);
    afficherRappels([]);
    afficherConsultations([]);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!Api.estConnecte()) { window.location.href = '/'; return; }
  chargerDashboard();
});
