if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => {
    regs.forEach(r => r.unregister());
  });
}

function animerECG(canvas) {
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
}

function mettreAJourStatut() {
  const point = document.querySelector('.statut-point');
  const texte = document.querySelector('.statut-texte');
  if (!point || !texte) return;
  if (navigator.onLine) { point.classList.add('en-ligne'); texte.textContent = 'En ligne'; }
  else { point.classList.remove('en-ligne'); texte.textContent = 'Hors ligne'; }
}
window.addEventListener('online',  mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);

function initOnglets() {
  const btnLogin    = document.getElementById('btn-onglet-login');
  const btnInscrip  = document.getElementById('btn-onglet-inscription');
  const formLogin   = document.getElementById('form-login');
  const formInscrip = document.getElementById('form-inscription');
  if (!btnLogin || !btnInscrip) return;
  btnLogin.addEventListener('click', () => {
    btnLogin.classList.add('actif'); btnInscrip.classList.remove('actif');
    formLogin.classList.remove('cache'); formInscrip.classList.add('cache');
  });
  btnInscrip.addEventListener('click', () => {
    btnInscrip.classList.add('actif'); btnLogin.classList.remove('actif');
    formInscrip.classList.remove('cache'); formLogin.classList.add('cache');
  });
}

function initRoleSelector() {
  const cartes = document.querySelectorAll('.role-carte');
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
      input.type = input.type === 'text' ? 'password' : 'text';
    });
  });
}

function afficherErreur(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alerte visible erreur';
}
function afficherSucces(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = 'alerte visible succes';
}
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

function redirigerSelonRole(utilisateur) {
  const role = utilisateur?.role;
  const destinations = {
    'agent':  '/dashboard-patient.html',
    'admin':  '/dashboard-admin.html',
    'agent_sante': '/dashboard-patient.html',
  };
  window.location.href = destinations[role] || '/dashboard-patient.html';
}

function initFormLogin() {
  const form = document.getElementById('form-login');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const telephone   = document.getElementById('login-telephone').value.trim();
    const mot_de_passe = document.getElementById('login-mdp').value;
    const btn = form.querySelector('.btn-primaire');
    if (!telephone || !mot_de_passe) {
      afficherErreur('alerte-login', 'Veuillez remplir tous les champs.');
      return;
    }
    btn.disabled = true;
    afficherLoading('Connexion en cours…');
    try {
      const data = await Api.connexion(telephone, mot_de_passe);
      afficherSucces('alerte-login', 'Connexion réussie !');
      const agent = data.data?.agent || data.agent || data.utilisateur;
      setTimeout(() => redirigerSelonRole(agent), 800);
    } catch (err) {
      cacherLoading(); btn.disabled = false;
      if (err.estOffline) afficherErreur('alerte-login', 'Hors ligne — vérifiez votre connexion.');
      else if (err.status === 401) afficherErreur('alerte-login', 'Téléphone ou mot de passe incorrect.');
      else afficherErreur('alerte-login', err.message || 'Une erreur est survenue.');
    }
  });
}

function initFormInscription() {
  const form = document.getElementById('form-inscription');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prenom     = document.getElementById('inscrip-prenom').value.trim();
    const nom        = document.getElementById('inscrip-nom').value.trim();
    const telephone  = document.getElementById('inscrip-telephone').value.trim();
    const mdp        = document.getElementById('inscrip-mdp').value;
    const mdp2       = document.getElementById('inscrip-mdp2').value;
    const role       = document.getElementById('input-role')?.value || 'agent';
    const btn        = form.querySelector('.btn-primaire');

    if (!prenom || !nom || !telephone || !mdp) {
      afficherErreur('alerte-inscription', 'Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (mdp !== mdp2) {
      afficherErreur('alerte-inscription', 'Les mots de passe ne correspondent pas.');
      return;
    }
    if (mdp.length < 8) {
      afficherErreur('alerte-inscription', 'Mot de passe trop court (min. 8 caractères).');
      return;
    }

    btn.disabled = true;
    afficherLoading('Création du compte…');
    try {
      const data = await Api.inscription({
        prenom, nom, telephone,
        mot_de_passe: mdp,
        role,
        district_id: 'aaf650c0-bea3-42c7-9954-401cfa81b508'
      });
      afficherSucces('alerte-inscription', 'Compte créé avec succès !');
      const agent = data.data?.agent || data.agent || data.utilisateur;
      setTimeout(() => redirigerSelonRole(agent), 800);
    } catch (err) {
      cacherLoading(); btn.disabled = false;
      if (err.estOffline) afficherErreur('alerte-inscription', 'Hors ligne — impossible de créer le compte.');
      else if (err.status === 409) afficherErreur('alerte-inscription', 'Ce numéro est déjà utilisé.');
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
