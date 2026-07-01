require('dotenv').config();
const { Pool } = require('pg');
const logger = require('../utils/logger');

let dbCircuitBreaker;
try {
  dbCircuitBreaker = require('../services/database/circuit-breaker.service').dbCircuitBreaker;
} catch(e) {
  dbCircuitBreaker = { execute: (fn) => fn(), getState: () => ({ state: 'CLOSED' }) };
}

const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
} : {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: false
};

const pool = new Pool(poolConfig);

pool.on('connect', () => logger.success('PostgreSQL connecté'));
pool.on('error',   (err) => logger.error('Erreur pool PostgreSQL', err));

const query = async (text, params) => {
  return dbCircuitBreaker.execute(async () => {
    const start = Date.now();
    try {
      const result = await pool.query(text, params);
      if (process.env.NODE_ENV === 'development') {
        logger.info(`🔍 Query: ${text} | Durée: ${Date.now()-start}ms`);
      }
      return result;
    } catch (err) {
      logger.error('Erreur SQL : ' + err.message);
      throw err;
    }
  });
};

const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const healthCheck = async () => {
  try {
    const start = Date.now();
    await pool.query('SELECT 1');
    return {
      status: 'ok',
      latence: Date.now() - start + 'ms',
      pool: { total: pool.totalCount, idle: pool.idleCount, waiting: pool.waitingCount },
      circuitBreaker: dbCircuitBreaker.getState()
    };
  } catch (err) {
    return { status: 'error', message: err.message, circuitBreaker: dbCircuitBreaker.getState() };
  }
};

module.exports = { pool, query, transaction, healthCheck };
