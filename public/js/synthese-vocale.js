const SyntheseVocale = {
  disponible: 'speechSynthesis' in window,
  voixLocale: null,

  init() {
    if (!this.disponible) return;
    window.speechSynthesis.onvoiceschanged = () => {
      const voix = window.speechSynthesis.getVoices();
      this.voixLocale = voix.find(v => v.lang.startsWith('fr')) || voix[0];
    };
    window.speechSynthesis.getVoices();
  },

  parler(texte, langue) {
    if (!this.disponible) { alert('Synthèse vocale non disponible sur cet appareil.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(texte);
    const langMap = { moore: 'fr-FR', dioula: 'fr-FR', fulfulde: 'fr-FR', fr: 'fr-FR' };
    utterance.lang = langMap[langue] || 'fr-FR';
    utterance.rate = 0.85;
    utterance.pitch = 1;
    if (this.voixLocale) utterance.voice = this.voixLocale;
    window.speechSynthesis.speak(utterance);
  },

  arreter() {
    if (this.disponible) window.speechSynthesis.cancel();
  }
};

SyntheseVocale.init();
window.SyntheseVocale = SyntheseVocale;
