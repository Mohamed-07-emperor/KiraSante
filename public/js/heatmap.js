/* ============================================
   KIRASANTE BF — CARTE DE CHALEUR SANITAIRE
   Leaflet.js + données districts
   ============================================ */

const HeatMap = {
  map: null,
  markers: [],
  couches: {},

  async init(containerId) {
    if (this.map) { this.map.remove(); this.map = null; }

    this.map = L.map(containerId, {
      center: [12.3667, -1.5333],
      zoom: 7,
      zoomControl: true
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributeurs',
      maxZoom: 18
    }).addTo(this.map);

    await this.chargerDonnees();
  },

  async chargerDonnees() {
    try {
      const [statsRes, alertesRes] = await Promise.allSettled([
        Api.requete('GET', '/dashboard/districts'),
        Api.requete('GET', '/alertes/actives')
      ]);

      const districts = statsRes.value?.data?.districts || [];
      const alertes   = alertesRes.value?.data?.alertes  || [];

      // Coordonnées des districts Burkina Faso
      const coordonnees = {
        'District de Ouagadougou': [12.3667, -1.5333],
        'District de Bobo-Dioulasso': [11.1771, -4.2979],
        'District de Koudougou': [12.2500, -2.3667],
        'District de Ouahigouya': [13.5667, -2.4167],
        'District de Banfora': [10.6333, -4.7667],
        'District de Kaya': [13.1000, -1.0833],
        'District de Dédougou': [12.4667, -3.4667],
        'District de Fada N\'Gourma': [12.0667,  0.3500],
        'District de Tenkodogo': [11.7833, -0.3667],
        'District de Dori': [14.0333,  0.0333],
      };

      // Ajouter marqueurs districts
      districts.forEach(d => {
        const coords = coordonnees[d.nom] || [12.3667 + (Math.random()-0.5)*2, -1.5333 + (Math.random()-0.5)*2];
        const total = parseInt(d.total_patients || 0);
        const alertesActives = parseInt(d.alertes_actives || 0);
        const couleur = alertesActives > 0 ? '#D94F4F' : total > 100 ? '#F2A640' : '#0F6E5C';
        const rayon = Math.max(8, Math.min(30, 8 + total / 5));

        const marker = L.circleMarker(coords, {
          radius: rayon,
          fillColor: couleur,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.75
        }).addTo(this.map);

        marker.bindPopup(`
          <div style="font-family:system-ui;min-width:160px">
            <strong style="color:#0A3D62">${d.nom}</strong><br>
            <span style="color:#4A6572;font-size:12px">${d.region || 'Burkina Faso'}</span><br><br>
            👥 <b>${d.total_patients || 0}</b> patients<br>
            🏥 <b>${d.total_consultations || 0}</b> consultations<br>
            ${alertesActives > 0
              ? `<span style="color:#D94F4F">⚠️ <b>${alertesActives}</b> alerte(s) active(s)</span>`
              : '<span style="color:#0F6E5C">✅ Aucune alerte</span>'}
          </div>
        `);
        this.markers.push(marker);
      });

      // Si pas de données districts, afficher Ouagadougou par défaut
      if (districts.length === 0) {
        L.marker([12.3667, -1.5333])
          .addTo(this.map)
          .bindPopup('<strong>District de Ouagadougou</strong><br>Zone principale KiraSante')
          .openPopup();
      }

      // Ajouter alertes
      alertes.forEach(a => {
        if (!a.latitude && !a.longitude) return;
        const iconeAlerte = L.divIcon({
          html: `<div style="background:#D94F4F;color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-size:16px;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">⚠️</div>`,
          className: '',
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });
        L.marker([a.latitude, a.longitude], { icon: iconeAlerte })
          .addTo(this.map)
          .bindPopup(`<strong style="color:#D94F4F">⚠️ ${a.type_alerte}</strong><br>${a.nombre_cas || 0} cas · ${new Date(a.date_detection).toLocaleDateString('fr-FR')}`);
      });

      // Légende
      this.ajouterLegende();

    } catch(e) {
      console.error('[HeatMap] Erreur chargement données:', e);
    }
  },

  ajouterLegende() {
    const legende = L.control({ position: 'bottomright' });
    legende.onAdd = () => {
      const div = L.DomUtil.create('div');
      div.style.cssText = 'background:white;padding:10px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.15);font-family:system-ui;font-size:12px';
      div.innerHTML = `
        <div style="font-weight:700;margin-bottom:6px;color:#0A3D62">Légende</div>
        <div style="display:flex;align-items:center;gap:6px;margin:3px 0"><div style="width:12px;height:12px;border-radius:50%;background:#0F6E5C"></div> Zone saine</div>
        <div style="display:flex;align-items:center;gap:6px;margin:3px 0"><div style="width:12px;height:12px;border-radius:50%;background:#F2A640"></div> Zone chargée</div>
        <div style="display:flex;align-items:center;gap:6px;margin:3px 0"><div style="width:12px;height:12px;border-radius:50%;background:#D94F4F"></div> Alerte active</div>`;
      return div;
    };
    legende.addTo(this.map);
  },

  actualiser() {
    this.markers.forEach(m => m.remove());
    this.markers = [];
    this.chargerDonnees();
  }
};

window.HeatMap = HeatMap;
