const cache = require('../services/cache/cache.service');
const logger = require('../utils/logger');

const cacheMiddleware = (ttlSeconds = 300, keyPrefix = '') => {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `${keyPrefix}:${req.user?.id || 'public'}:${req.originalUrl}`;
    const cached = cache.get(key);

    if (cached) {
      logger.info(`Cache HIT : ${key}`);
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode === 200) {
        cache.set(key, data, ttlSeconds);
        logger.info(`Cache SET : ${key} (${ttlSeconds}s)`);
      }
      return originalJson(data);
    };

    next();
  };
};

const invalidateCache = (pattern) => {
  cache.deletePattern(pattern);
};

module.exports = { cacheMiddleware, invalidateCache };
