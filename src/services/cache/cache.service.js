const logger = require('../../utils/logger');

class MemoryCache {
  constructor() {
    this.store = new Map();
    this.stats = { hits: 0, misses: 0, sets: 0, deletes: 0 };
  }

  set(key, value, ttlSeconds = 300) {
    const expireAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expireAt });
    this.stats.sets++;
  }

  get(key) {
    const item = this.store.get(key);
    if (!item) { this.stats.misses++; return null; }
    if (Date.now() > item.expireAt) {
      this.store.delete(key);
      this.stats.misses++;
      return null;
    }
    this.stats.hits++;
    return item.value;
  }

  delete(key) {
    this.store.delete(key);
    this.stats.deletes++;
  }

  deletePattern(pattern) {
    for (const key of this.store.keys()) {
      if (key.includes(pattern)) {
        this.store.delete(key);
        this.stats.deletes++;
      }
    }
  }

  clear() {
    this.store.clear();
  }

  nettoyer() {
    const now = Date.now();
    let supprimes = 0;
    for (const [key, item] of this.store.entries()) {
      if (now > item.expireAt) {
        this.store.delete(key);
        supprimes++;
      }
    }
    if (supprimes > 0) logger.info(`Cache nettoyé : ${supprimes} entrées supprimées`);
  }

  getStats() {
    return {
      ...this.stats,
      taille: this.store.size,
      hitRate: this.stats.hits + this.stats.misses > 0
        ? ((this.stats.hits / (this.stats.hits + this.stats.misses)) * 100).toFixed(1) + '%'
        : '0%'
    };
  }
}

const cache = new MemoryCache();

// Nettoyage toutes les 5 minutes
setInterval(() => cache.nettoyer(), 5 * 60 * 1000);

module.exports = cache;
