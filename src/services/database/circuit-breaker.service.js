const logger = require('../../utils/logger');

class CircuitBreaker {
  constructor(options = {}) {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.threshold = options.threshold || 5;
    this.timeout = options.timeout || 60000;
    this.halfOpenMax = options.halfOpenMax || 2;
  }

  async execute(fn) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
        logger.warn('Circuit breaker : HALF_OPEN');
      } else {
        throw new Error('Circuit breaker OPEN — base de donnees indisponible');
      }
    }
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (err) {
      this.onFailure();
      throw err;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenMax) {
        this.state = 'CLOSED';
        this.successCount = 0;
        logger.success('Circuit breaker : CLOSED — connexion retablie');
      }
    }
  }

  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = 'OPEN';
      logger.error(`Circuit breaker : OPEN apres ${this.failureCount} echecs`);
    }
  }

  getState() {
    return { state: this.state, failureCount: this.failureCount, lastFailureTime: this.lastFailureTime };
  }
}

const dbCircuitBreaker = new CircuitBreaker({ threshold: 5, timeout: 60000 });
module.exports = { CircuitBreaker, dbCircuitBreaker };
