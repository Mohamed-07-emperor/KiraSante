const fs = require('fs');
const path = require('path');
const dico = JSON.parse(fs.readFileSync(path.join(__dirname,'../../data/dictionnaire.json'),'utf8'));
const LANGUES = ['fr','moore','dioula','fulfulde'];
const norm = t => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
const traduire = (terme, langue='moore') => {
  if (!LANGUES.includes(langue)) return { succes:false, message:'Langue non supportee: '+langue };
  const e = dico[norm(terme)];
  if (!e) return { succes:false, message:'Terme introuvable: '+terme };
  return { succes:true, terme_original:terme, langue, traduction:e[langue]||e.fr, pictogramme:e.pictogramme||null, dosage:e.dosage||null, frequence:e.frequence||null, symptomes:e.symptomes||null };
};
const rechercherFloue = (terme, langue='moore') => {
  const c = norm(terme);
  const res = [];
  for (const [k,v] of Object.entries(dico)) {
    if (k.includes(c)||c.includes(k)||(v.fr&&v.fr.toLowerCase().includes(c)))
      res.push({ cle:k, terme_fr:v.fr, traduction:v[langue]||v.fr, pictogramme:v.pictogramme||null });
  }
  return res.slice(0,5);
};
const traduireOrdonnance = (texte, langue='moore') => {
  const mots = texte.toLowerCase().split(/\s+/);
  const trad = [];
  for (const m of mots) {
    const n = norm(m);
    if (dico[n]) trad.push({ mot_original:m, traduction:dico[n][langue]||dico[n].fr, pictogramme:dico[n].pictogramme });
  }
  return { texte_original:texte, langue, traductions:trad, couverture:trad.length+'/'+mots.length+' mots traduits' };
};
const listerTermes = () => Object.entries(dico).map(([k,v])=>({ cle:k, fr:v.fr, moore:v.moore, dioula:v.dioula, fulfulde:v.fulfulde, pictogramme:v.pictogramme }));
module.exports = { traduire, rechercherFloue, traduireOrdonnance, listerTermes };
