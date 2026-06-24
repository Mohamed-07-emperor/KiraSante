/* ============================================
   KIRASANTE BF — PICTOGRAMMES MÉDICAUX SVG
   Icônes universelles pour patients analphabètes
   ============================================ */

const PICTOGRAMMES = {
  // MÉDICAMENTS
  'comprimes': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="20" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/><ellipse cx="24" cy="24" rx="12" ry="8" fill="#0F6E5C" opacity="0.8"/><line x1="12" y1="24" x2="36" y2="24" stroke="white" stroke-width="2"/></svg>`,
  'sirop': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="16" y="10" width="16" height="28" rx="3" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/><rect x="20" y="6" width="8" height="6" rx="1" fill="#0F6E5C"/><rect x="16" y="22" width="16" height="8" fill="#0F6E5C" opacity="0.5"/></svg>`,
  'injection': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><line x1="8" y1="40" x2="36" y2="12" stroke="#0F6E5C" stroke-width="3" stroke-linecap="round"/><rect x="30" y="6" width="10" height="6" rx="1" fill="#0F6E5C" transform="rotate(45 35 9)"/><circle cx="10" cy="38" r="3" fill="#F2A640"/></svg>`,
  'gouttes': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 8 C24 8 12 22 12 30 C12 38 18 42 24 42 C30 42 36 38 36 30 C36 22 24 8 24 8Z" fill="#0F6E5C" opacity="0.8"/><path d="M20 32 C20 29 22 27 24 27" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/></svg>`,
  'pommade': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="12" y="18" width="24" height="22" rx="4" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/><rect x="18" y="10" width="12" height="10" rx="2" fill="#0F6E5C"/><path d="M16 28 Q24 24 32 28" stroke="#0F6E5C" stroke-width="2" fill="none"/></svg>`,

  // FRÉQUENCES
  'matin': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="10" fill="#F2A640"/><line x1="24" y1="6" x2="24" y2="12" stroke="#F2A640" stroke-width="3" stroke-linecap="round"/><line x1="24" y1="36" x2="24" y2="42" stroke="#F2A640" stroke-width="3" stroke-linecap="round"/><line x1="6" y1="24" x2="12" y2="24" stroke="#F2A640" stroke-width="3" stroke-linecap="round"/><line x1="36" y1="24" x2="42" y2="24" stroke="#F2A640" stroke-width="3" stroke-linecap="round"/></svg>`,
  'soir': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M28 10 C20 12 14 20 14 28 C14 36 20 42 28 42 C36 42 42 36 42 28 C36 30 30 26 28 10Z" fill="#0A3D62"/><circle cx="10" cy="12" r="3" fill="#F2A640"/><circle cx="16" cy="6" r="2" fill="#F2A640"/><circle cx="6" cy="20" r="2" fill="#F2A640"/></svg>`,
  'repas': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><line x1="14" y1="10" x2="14" y2="38" stroke="#0F6E5C" stroke-width="3" stroke-linecap="round"/><path d="M14 10 C14 10 8 14 8 20 C8 26 14 26 14 26" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/><line x1="34" y1="10" x2="34" y2="38" stroke="#0F6E5C" stroke-width="3" stroke-linecap="round"/><path d="M28 10 L28 22 Q34 22 34 16 L34 10" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/></svg>`,
  'eau': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 6 L14 22 C14 32 18 40 24 40 C30 40 34 32 34 22 Z" fill="#0A3D62" opacity="0.7"/><ellipse cx="20" cy="28" rx="3" ry="5" fill="white" opacity="0.4" transform="rotate(-20 20 28)"/></svg>`,

  // SYMPTOMES
  'fievre': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="20" y="6" width="8" height="28" rx="4" fill="#E8F5F1" stroke="#D94F4F" stroke-width="2"/><rect x="22" y="20" width="4" height="18" rx="2" fill="#D94F4F"/><circle cx="24" cy="36" r="6" fill="#D94F4F"/><line x1="28" y1="14" x2="34" y2="14" stroke="#D94F4F" stroke-width="2"/><line x1="28" y1="20" x2="34" y2="20" stroke="#D94F4F" stroke-width="2"/></svg>`,
  'toux': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M10 20 C10 14 16 10 24 10 C32 10 38 14 38 20 C38 26 32 30 24 30" stroke="#0A3D62" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M18 30 L24 38 L30 30" stroke="#0A3D62" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="14" cy="20" r="2" fill="#F2A640"/></svg>`,
  'douleur': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M24 8 L28 18 L40 18 L30 26 L34 38 L24 30 L14 38 L18 26 L8 18 L20 18 Z" fill="#D94F4F" opacity="0.8"/></svg>`,
  'vomissement': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="16" r="10" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/><path d="M20 22 C20 30 16 36 16 40" stroke="#0F6E5C" stroke-width="2.5" stroke-linecap="round"/><path d="M16 38 L12 42 M16 38 L20 42" stroke="#0F6E5C" stroke-width="2" stroke-linecap="round"/></svg>`,

  // MALADIES
  'paludisme': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><ellipse cx="24" cy="24" rx="16" ry="8" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/><path d="M12 20 C8 16 6 10 10 8 C14 6 16 12 12 20Z" fill="#D94F4F" opacity="0.8"/><circle cx="10" cy="8" r="3" fill="#D94F4F"/><path d="M36 20 L40 14 L44 16 L42 22Z" fill="#D94F4F" opacity="0.6"/></svg>`,
  'grossesse': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><ellipse cx="24" cy="28" rx="12" ry="14" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/><circle cx="24" cy="12" r="7" fill="#E8F5F1" stroke="#0F6E5C" stroke-width="2"/><circle cx="22" cy="26" r="5" fill="#0F6E5C" opacity="0.3"/></svg>`,
  'vaccination': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><path d="M30 8 L40 18 L36 22 L26 12 Z" fill="#0F6E5C"/><line x1="26" y1="12" x2="10" y2="28" stroke="#0A3D62" stroke-width="3" stroke-linecap="round"/><line x1="8" y1="34" x2="8" y2="42" stroke="#D94F4F" stroke-width="3" stroke-linecap="round"/><circle cx="18" cy="30" r="3" fill="#F2A640"/></svg>`,

  // PRÉCAUTIONS
  'interdit_alcool': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="18" fill="none" stroke="#D94F4F" stroke-width="3"/><line x1="10" y1="10" x2="38" y2="38" stroke="#D94F4F" stroke-width="3"/><rect x="18" y="14" width="12" height="20" rx="3" fill="#F2A640" opacity="0.6"/></svg>`,
  'repos': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><rect x="6" y="22" width="36" height="18" rx="4" fill="#E8F5F1" stroke="#0A3D62" stroke-width="2"/><rect x="6" y="26" width="36" height="6" fill="#0A3D62" opacity="0.2"/><path d="M14 22 L14 16 Q14 12 18 12 L30 12 Q34 12 34 16 L34 22" fill="none" stroke="#0A3D62" stroke-width="2"/><rect x="10" y="12" width="6" height="4" rx="1" fill="#0A3D62" opacity="0.5"/></svg>`,
  'soleil': `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg"><circle cx="24" cy="24" r="10" fill="#F2A640"/><line x1="24" y1="6" x2="24" y2="12" stroke="#F2A640" stroke-width="2.5" stroke-linecap="round"/><line x1="24" y1="36" x2="24" y2="42" stroke="#F2A640" stroke-width="2.5" stroke-linecap="round"/><line x1="6" y1="24" x2="12" y2="24" stroke="#F2A640" stroke-width="2.5" stroke-linecap="round"/><line x1="36" y1="24" x2="42" y2="24" stroke="#F2A640" stroke-width="2.5" stroke-linecap="round"/><line x1="11" y1="11" x2="15" y2="15" stroke="#F2A640" stroke-width="2" stroke-linecap="round"/><line x1="33" y1="33" x2="37" y2="37" stroke="#F2A640" stroke-width="2" stroke-linecap="round"/></svg>`,
};

function obtenirPictogramme(cle, taille = 40) {
  const svg = PICTOGRAMMES[cle] || PICTOGRAMMES['comprimes'];
  return `<span style="display:inline-flex;width:${taille}px;height:${taille}px">${svg}</span>`;
}

function afficherPictogrammesTraduction(traduction) {
  const map = {
    'paracetamol': 'comprimes', 'comprimes': 'comprimes', 'sirop': 'sirop',
    'vaccin': 'vaccination', 'vaccination': 'vaccination', 'injection': 'injection',
    'fievre': 'fievre', 'toux': 'toux', 'douleur': 'douleur',
    'vomissement': 'vomissement', 'paludisme': 'paludisme',
    'grossesse': 'grossesse', 'eau': 'eau', 'repos': 'repos',
    'matin': 'matin', 'soir': 'soir', 'repas': 'repas'
  };
  const cle = map[traduction?.toLowerCase()] || 'comprimes';
  return obtenirPictogramme(cle, 48);
}

window.PICTOGRAMMES = PICTOGRAMMES;
window.obtenirPictogramme = obtenirPictogramme;
window.afficherPictogrammesTraduction = afficherPictogrammesTraduction;
