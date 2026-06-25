if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister()));
}

// ---- ECG ----
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

// ---- STATUT ----
function mettreAJourStatut() {
  const point = document.querySelector('.statut-point');
  const texte = document.querySelector('.statut-texte');
  if (!point || !texte) return;
  if (navigator.onLine) { point.classList.add('en-ligne'); texte.textContent = 'En ligne'; }
  else { point.classList.remove('en-ligne'); texte.textContent = 'Hors ligne'; }
}
window.addEventListener('online',  mettreAJourStatut);
window.addEventListener('offline', mettreAJourStatut);

// ---- ONGLETS ----
function initOnglets() {
  const btnLogin   = document.getElementById('btn-onglet-login');
  const btnInscrip = document.getElementById('btn-onglet-inscription');
  if (!btnLogin || !btnInscrip) return;
  btnLogin.addEventListener('click', () => basculerOnglet('login'));
  btnInscrip.addEventListener('click', () => basculerOnglet('inscription'));
}

function basculerOnglet(onglet) {
  const btnLogin   = document.getElementById('btn-onglet-login');
  const btnInscrip = document.getElementById('btn-onglet-inscription');
  const formLogin  = document.getElementById('form-login');
  const formInscrip = document.getElementById('form-inscription');
  const formOtp    = document.getElementById('form-otp');
  if (onglet === 'login') {
    btnLogin.classList.add('actif'); btnInscrip.classList.remove('actif');
    formLogin.classList.remove('cache');
    formInscrip.classList.add('cache');
    formOtp.classList.add('cache');
  } else {
    btnInscrip.classList.add('actif'); btnLogin.classList.remove('actif');
    formInscrip.classList.remove('cache');
    formLogin.classList.add('cache');
    formOtp.classList.add('cache');
  }
}

// ---- ROLE SELECTOR ----
function initRoleSelector() {
  const cartes = document.querySelectorAll('.role-carte');
  const input  = document.getElementById('login-role');
  cartes.forEach(c => {
    c.addEventListener('click', () => {
      cartes.forEach(x => x.classList.remove('selectionnee'));
      c.classList.add('selectionnee');
      if (input) input.value = c.dataset.role;
    });
  });
}

// ---- TOGGLE MDP ----
function initToggleMdp() {
  document.querySelectorAll('.toggle-mdp').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      if (input) input.type = input.type === 'text' ? 'password' : 'text';
    });
  });
}

// ---- UTILITAIRES ----
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

// ---- REDIRECTION ----
function redirigerSelonRole(utilisateur) {
  const role = utilisateur?.role || utilisateur?.type;
  const destinations = {
    'patient':     '/dashboard-patient.html',
    'agent':       '/dashboard-agent.html',
    'agent_sante': '/dashboard-agent.html',
    'admin':       '/dashboard-admin.html',
  };
  window.location.href = destinations[role] || '/dashboard-patient.html';
}

// ---- LOGIN ----
function initFormLogin() {
  const form = document.getElementById('form-login');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const telephone    = document.getElementById('login-telephone').value.trim();
    const mot_de_passe = document.getElementById('login-mdp').value;
    const role         = document.getElementById('login-role')?.value || 'patient';
    const btn          = form.querySelector('.btn-primaire');
    if (!telephone || !mot_de_passe) {
      afficherErreur('alerte-login', 'Veuillez remplir tous les champs.');
      return;
    }
    btn.disabled = true;
    afficherLoading('Connexion en cours…');
    try {
      let data;
      if (role === 'patient') {
        data = await Api.requete('POST', '/otp/login-patient', { telephone, mot_de_passe });
        const patient = data.data?.patient;
        const token   = data.data?.token;
        if (token) {
          Api.setToken(token);
          Api.setUtilisateur({ ...patient, role: 'patient' });
        }
      } else {
        data = await Api.connexion(telephone, mot_de_passe);
      }
      cacherLoading();
      afficherSucces('alerte-login', 'Connexion réussie !');
      const user = data.data?.agent || data.data?.patient || data.data?.utilisateur || Api.getUtilisateur();
      setTimeout(() => redirigerSelonRole(user), 800);
    } catch(err) {
      cacherLoading(); btn.disabled = false;
      if (err.estOffline) afficherErreur('alerte-login', 'Hors ligne — vérifiez votre connexion.');
      else if (err.status === 401) afficherErreur('alerte-login', 'Téléphone ou mot de passe incorrect.');
      else afficherErreur('alerte-login', err.message || 'Une erreur est survenue.');
    }
  });
}

// ---- DONNÉES INSCRIPTION TEMPORAIRES ----
let donneesInscription = {};

// ---- INSCRIPTION ÉTAPE 1 ----
function initFormInscription() {
  const form = document.getElementById('form-inscription');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const prenom      = document.getElementById('inscrip-prenom').value.trim();
    const nom         = document.getElementById('inscrip-nom').value.trim();
    const telephone   = document.getElementById('inscrip-telephone').value.trim();
    const sexe        = document.getElementById('inscrip-sexe').value;
    const ddn         = document.getElementById('inscrip-ddn').value;
    const mdp         = document.getElementById('inscrip-mdp').value;
    const mdp2        = document.getElementById('inscrip-mdp2').value;
    const btn         = form.querySelector('.btn-primaire');

    if (!prenom || !nom || !telephone || !sexe || !ddn || !mdp) {
      afficherErreur('alerte-inscription', 'Veuillez remplir tous les champs obligatoires (*)');
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
    afficherLoading('Envoi du code de vérification…');

    try {
      const data = await Api.requete('POST', '/otp/envoyer', { telephone, type: 'inscription' });
      cacherLoading(); btn.disabled = false;

      // Sauvegarder données pour étape 2
      donneesInscription = { prenom, nom, telephone, sexe, date_naissance: ddn, mot_de_passe: mdp };

      // Afficher formulaire OTP
      document.getElementById('form-inscription').classList.add('cache');
      document.getElementById('form-otp').classList.remove('cache');
      document.getElementById('otp-telephone').textContent = telephone;

      // Afficher code démo si sandbox
      if (data.data?.code_demo) {
        const container = document.getElementById('demo-code-container');
        const codeEl    = document.getElementById('demo-code');
        if (container) container.style.display = 'block';
        if (codeEl)    codeEl.textContent = data.data.code_demo;
      }

    } catch(err) {
      cacherLoading(); btn.disabled = false;
      if (err.status === 400 && err.message.includes('deja')) {
        afficherErreur('alerte-inscription', 'Ce numéro est déjà enregistré. Connectez-vous.');
      } else {
        afficherErreur('alerte-inscription', err.message || 'Erreur envoi du code.');
      }
    }
  });
}

// ---- INSCRIPTION ÉTAPE 2 (OTP) ----
function initFormOTP() {
  const form = document.getElementById('form-otp');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const code = document.getElementById('otp-code').value.trim();
    const btn  = form.querySelector('.btn-primaire');

    if (!code || code.length !== 6) {
      afficherErreur('alerte-otp', 'Veuillez entrer le code à 6 chiffres.');
      return;
    }

    btn.disabled = true;
    afficherLoading('Vérification du code…');

    try {
      const data = await Api.requete('POST', '/otp/verifier-inscription', {
        ...donneesInscription,
        code
      });

      const token   = data.data?.token;
      const patient = data.data?.patient;
      if (token) {
        Api.setToken(token);
        Api.setUtilisateur({ ...patient, role: 'patient' });
      }

      cacherLoading();
      afficherSucces('alerte-otp', 'Compte créé avec succès ! Redirection…');
      setTimeout(() => window.location.href = '/dashboard-patient.html', 1000);

    } catch(err) {
      cacherLoading(); btn.disabled = false;
      if (err.status === 401) afficherErreur('alerte-otp', 'Code invalide ou expiré. Réessayez.');
      else afficherErreur('alerte-otp', err.message || 'Erreur de vérification.');
    }
  });
}

window.renvoyerOTP = async function() {
  const tel = donneesInscription.telephone;
  if (!tel) return;
  afficherLoading('Renvoi du code…');
  try {
    const data = await Api.requete('POST', '/otp/envoyer', { telephone: tel, type: 'inscription' });
    cacherLoading();
    afficherSucces('alerte-otp', 'Nouveau code envoyé !');
    if (data.data?.code_demo) {
      const codeEl = document.getElementById('demo-code');
      if (codeEl) codeEl.textContent = data.data.code_demo;
      document.getElementById('demo-code-container').style.display = 'block';
    }
  } catch(e) {
    cacherLoading();
    afficherErreur('alerte-otp', e.message || 'Erreur renvoi.');
  }
};

window.retourInscription = function() {
  document.getElementById('form-otp').classList.add('cache');
  document.getElementById('form-inscription').classList.remove('cache');
};

// ---- INIT ----
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
  initFormOTP();
});
