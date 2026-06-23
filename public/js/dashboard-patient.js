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

// ---- AGE ----
function calculerAge(dateNaissance) {
  if (!dateNaissance) return '—';
  const n = new Date(dateNaissance);
  const a = new Date();
  let age = a.getFullYear() - n.getFullYear();
  if (a.getMonth() - n.getMonth() < 0 || (a.getMonth() === n.getMonth() && a.getDate() < n.getDate())) age--;
  return age + ' ans';
}

// ---- FORMAT DATE ----
function formatDate(dateStr) {
  if (!dateStr) return { jour: '—', mois: '—', annee: '—' };
  const d = new Date(dateStr);
  const mois = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
  return { jour: d.getDate(), mois: mois[d.getMonth()], annee: d.getFullYear() };
}

// ---- REMPLIR PROFIL ----
function remplirProfil(user) {
  if (!user) return;
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val || '—'; };

  const prenom = user.prenom || '';
  const nom    = user.nom    || '';
  set('dash-nom', `${prenom} ${nom}`.trim() || '—');
  set('patient-id', user.id ? `KS-${String(user.id).substring(0,8).toUpperCase()}` : '—');
  set('patient-age',      calculerAge(user.date_naissance));
  set('groupe-sanguin',   user.groupe_sanguin || '—');
  set('patient-district', user.district_nom || user.district || '—');

  // Badge rôle
  const badge = document.getElementById('badge-role');
  if (badge) {
    const roles = { admin: 'Admin', agent: 'Agent', agent_sante: 'Agent de santé', patient: 'Patient' };
    badge.textContent = roles[user.role] || user.role || 'Utilisateur';
    badge.className = `badge-role ${user.role || 'patient'}`;
  }
}

// ---- STATS ----
function remplirStats(consultations, vaccinations, rappels, alertes) {
  const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val ?? '0'; };
  set('stat-consultations', consultations);
  set('stat-vaccins',       vaccinations);
  set('stat-rappels',       rappels);
  set('stat-alertes',       alertes);
}

// ---- RAPPELS ----
function afficherRappels(rappels) {
  const liste = document.getElementById('liste-rappels');
  const badge = document.getElementById('badge-rappels');
  if (!liste) return;
  const items = Array.isArray(rappels) ? rappels : [];
  if (badge) badge.textContent = items.length;
  if (items.length === 0) {
    liste.innerHTML = `<div class="etat-vide"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg><span>Aucun rappel vaccinal en attente</span></div>`;
    return;
  }
  liste.innerHTML = items.map(r => {
    const date = r.prochain_rappel ? new Date(r.prochain_rappel).toLocaleDateString('fr-FR') : '—';
    const diff = r.prochain_rappel ? Math.ceil((new Date(r.prochain_rappel) - new Date()) / (1000*60*60*24)) : 999;
    let statut = 'ok', label = date;
    if (diff < 0)  { statut = 'urgent'; label = 'En retard'; }
    else if (diff <= 7) { statut = 'urgent'; label = `Dans ${diff}j`; }
    else if (diff <= 30){ statut = 'normal'; label = `Dans ${diff}j`; }
    return `<div class="rappel-item">
      <div class="rappel-icone"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
      <div class="rappel-info"><div class="rappel-nom">${r.vaccin_nom || r.vaccin || 'Vaccin'}</div><div class="rappel-date">${date}</div></div>
      <span class="rappel-statut ${statut}">${label}</span>
    </div>`;
  }).join('');
}

// ---- CONSULTATIONS ----
function afficherConsultations(consultations) {
  const liste = document.getElementById('liste-consultations');
  if (!liste) return;
  const items = Array.isArray(consultations) ? consultations.slice(0,5) : [];
  if (items.length === 0) {
    liste.innerHTML = `<div class="etat-vide"><svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg><span>Aucune consultation enregistrée</span></div>`;
    return;
  }
  liste.innerHTML = items.map(c => {
    const d = formatDate(c.date_consultation || c.created_at);
    return `<div class="consultation-item">
      <div class="consultation-date-bloc"><span class="consultation-jour">${d.jour}</span><span class="consultation-mois">${d.mois}</span></div>
      <div class="consultation-info">
        <div class="consultation-motif">${c.motif || 'Consultation générale'}</div>
        <div class="consultation-agent">${c.agent_prenom ? `Dr. ${c.agent_prenom} ${c.agent_nom||''}` : 'Agent de santé'}</div>
        ${c.notes ? `<div class="consultation-notes">${c.notes.substring(0,80)}${c.notes.length>80?'…':''}</div>` : ''}
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

// ---- NAV BAS ----
document.querySelectorAll('.nav-item').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('actif'));
    btn.classList.add('actif');
  });
});

// ---- CHARGEMENT PRINCIPAL ----
async function chargerDashboard() {
  const user = Api.getUtilisateur();
  if (!user) { window.location.href = '/'; return; }

  remplirProfil(user);
  afficherDate();
  mettreAJourStatut();

  try {
    const [profilRes, rappelsRes, statsRes] = await Promise.allSettled([
      Api.profil(),
      Api.requete('GET', '/dashboard/rappels'),
      Api.requete('GET', '/dashboard/stats')
    ]);

    // Profil
    if (profilRes.status === 'fulfilled') {
      const u = profilRes.value?.data || profilRes.value?.utilisateur || profilRes.value;
      if (u?.id) { Api.setUtilisateur(u); remplirProfil(u); }
    }

    // Rappels
    const rappels = rappelsRes.status === 'fulfilled'
      ? (rappelsRes.value?.data?.rappels || rappelsRes.value?.rappels || [])
      : [];
    afficherRappels(rappels);

    // Stats
    if (statsRes.status === 'fulfilled') {
      const s = statsRes.value?.data || {};
      remplirStats(
        s.consultations || 0,
        s.vaccinations  || 0,
        rappels.length,
        s.alertes_actives || 0
      );
    }

    // Consultations via patient_id
    const uid = Api.getUtilisateur()?.id;
    if (uid) {
      try {
        const consRes = await Api.requete('GET', `/consultations/patient/${uid}`);
        const cons = consRes?.data?.consultations || consRes?.consultations || [];
        afficherConsultations(cons);
        const el = document.getElementById('stat-consultations');
        if (el) el.textContent = cons.length;
      } catch(e) { afficherConsultations([]); }
    }

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
