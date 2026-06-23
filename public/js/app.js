if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js')
    .then(() => console.log('[KiraSante] SW enregistré'))
    .catch(err => console.warn('[KiraSante] SW échec:', err));
}

function animerECG(canvas) {
  const ctx = canvas.getContext('2d');
  let phase = 0;
  function redimensionner() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  function valeurECG(t) {
    const cycle = t % 1;
    if (cycle < 0.3)  return Math.sin(cycle * Math.PI * 2) * 0.15;
    if (cycle < 0.4)  return -0.1;
    if (cycle < 0.42) return -0.3;
    if (cycle < 0.45) return 1.0;
    if (cycle < 0.48) return -0.25;
    if (cycle < 0.6)  return Math.sin((cycle - 0.48) * Math.PI / 0.12) * 0.2;
    return 0;
  }
  function dessiner() {
    redimensionner();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    const w = canvas.width, h = canvas.height;
    for (let i = 0; i < w; i++) {
      const t = (i / w) * 2 + phase;
      const y = h / 2 - valeurECG(t) * (h * 0.4);
      if (i === 0) ctx.moveTo(i, y); else ctx.lineTo(i, y);
    }
    ctx.stroke();
    phase += 0.003;
    requestAnimationFrame(dessiner);
  }
  redimensionner();
  dessiner();
}

function mettreAJourStatut() {
  const point = document.querySelector('.statut-point');
  const texte = document.querySelector('.statut-texte');
  if (!point || !texte) return;
  if (navigator.onLine) {
    point.classList.add('en-ligne');
    texte.textContent = 'En ligne';
  } else {
    point.classList.remove('en-ligne');
    texte.textContent = 'Hors ligne';
  }
}
window.addEventListener('online',  mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);

function initOnglets() {
  const btnLogin    = document.getElementById('btn-onglet-login');
  const btnInscrip  = document.getElementById('btn-onglet-inscription');
  const formLogin   = document.getElementById('form-login');
  const formInscrip = document.getElementById('form-inscription');
  function basculer(onglet) {
    if (onglet === 'login') {
      btnLogin.classList.add('actif'); btnInscrip.classList.remove('actif');
      formLogin.classList.remove('cache'); formInscrip.classList.add('cache');
    } else {
      btnInscrip.classList.add('actif'); btnLogin.classList.remove('actif');
      formInscrip.classList.remove('cache'); formLogin.classList.add('cache');
    }
  }
  btnLogin.addEventListener('click',   () => basculer('login'));
  btnInscrip.addEventListener('click', () => basculer('inscription'));
}

function initRoleSelector() {
  const cartes   = document.querySelectorAll('.role-carte');
  const inputRole = document.getElementById('input-role');
  cartes.forEach(carte => {
    carte.addEventListener('click', () => {
      cartes.forEach(c => c.classList.remove('selectionnee'));
      carte.classList.add('selectionnee');
      if (inputRole) inputRole.value = carte.dataset.role;
    });
  });
}

function initToggleMdp() {
  document.querySelectorAll('.toggle-mdp').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (!input) return;
      const visible = input.type === 'text';
      input.type = visible ? 'password' : 'text';
      btn.innerHTML = visible
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
    });
  });
}

function afficherErreur(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible', 'erreur');
  el.classList.remove('succes');
}
function afficherSucces(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible', 'succes');
  el.classList.remove('erreur');
}
function cacherAlerte(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('visible');
}
function afficherLoading(msg = 'Chargement…') {
  const overlay = document.getElementById('loading-overlay');
  const texte   = document.getElementById('loading-texte');
  if (overlay) overlay.classList.add('visible');
  if (texte)   texte.textContent = msg;
}
function cacherLoading() {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) overlay.classList.remove('visible');
}
function redirigerSelonRole(utilisateur) {
  const role = utilisateur?.role || utilisateur?.roles?.[0];
  const destinations = {
    'patient':     '/dashboard-patient.html',
    'agent_sante': '/dashboard-agent.html',
    'admin': '/dashboard-patient.html',
  };
  window.location.href = destinations[role] || '/dashboard.html';
}

function initFormLogin() {
  const form = document.getElementById('form-login');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    cacherAlerte('alerte-login');
    const telephone = document.getElementById('login-telephone').value.trim();
    const mot_de_passe = document.getElementById('login-mdp').value;
    const btn   = form.querySelector('.btn-primaire');
    if (!email || !mdp) { afficherErreur('alerte-login', 'Veuillez remplir tous les champs.'); return; }
    btn.disabled = true;
    afficherLoading('Connexion en cours…');
    try {
      const data = await Api.connexion(telephone, mot_de_passe);
      afficherSucces('alerte-login', 'Connexion réussie !');
      setTimeout(() => redirigerSelonRole(data.data?.agent || data.utilisateur || data.user), 800);
    } catch (err) {
      cacherLoading(); btn.disabled = false;
      if (err.estOffline) afficherErreur('alerte-login', '📡 Hors ligne — vérifiez votre connexion.');
      else if (err.status === 401) afficherErreur('alerte-login', 'Email ou mot de passe incorrect.');
      else afficherErreur('alerte-login', err.message || 'Une erreur est survenue.');
    }
  });
}

function initFormInscription() {
  const form = document.getElementById('form-inscription');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    cacherAlerte('alerte-inscription');
    const prenom = document.getElementById('inscrip-prenom').value.trim();
    const nom    = document.getElementById('inscrip-nom').value.trim();
    const email  = document.getElementById('inscrip-email').value.trim();
    const mdp    = document.getElementById('inscrip-mdp').value;
    const mdp2   = document.getElementById('inscrip-mdp2').value;
    const role   = document.getElementById('input-role')?.value || 'agent';
    const telephone = document.getElementById('inscrip-telephone')?.value.trim() || '';
    const btn    = form.querySelector('.btn-primaire');
    if (!prenom || !nom || !email || !mdp) { afficherErreur('alerte-inscription', 'Veuillez remplir tous les champs.'); return; }
    if (mdp !== mdp2) { afficherErreur('alerte-inscription', 'Les mots de passe ne correspondent pas.'); return; }
    if (mdp.length < 8) { afficherErreur('alerte-inscription', 'Mot de passe trop court (min. 8 caractères).'); return; }
    btn.disabled = true;
    afficherLoading('Création du compte…');
    try {
      const data = await Api.inscription({ prenom, nom, telephone, mot_de_passe: mdp, district_id: "aaf650c0-bea3-42c7-9954-401cfa81b508", role });
      afficherSucces('alerte-inscription', 'Compte créé avec succès !');
      setTimeout(() => redirigerSelonRole(data.data?.agent || data.utilisateur || data.user), 800);
    } catch (err) {
      cacherLoading(); btn.disabled = false;
      if (err.estOffline) afficherErreur('alerte-inscription', '📡 Hors ligne — impossible de créer le compte.');
      else if (err.status === 409) afficherErreur('alerte-inscription', 'Cet email est déjà utilisé.');
      else afficherErreur('alerte-inscription', err.message || 'Une erreur est survenue.');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  if (Api.estConnecte()) { redirigerSelonRole(Api.getUtilisateur()); return; }
  const canvas = document.getElementById('ecg-canvas');
  if (canvas) animerECG(canvas);
  mettreAJourStatut();
  initOnglets();
  initRoleSelector();
  initToggleMdp();
  initFormLogin();
  initFormInscription();
});
