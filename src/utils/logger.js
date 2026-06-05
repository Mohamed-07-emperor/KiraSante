const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logToFile = (level, message, meta = {}) => {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    message,
    pid: process.pid,
    ...meta
  });
  fs.appendFileSync(path.join(logDir, 'app.log'), entry + '\n');

  // Log erreurs séparément
  if (level === 'ERROR') {
    fs.appendFileSync(path.join(logDir, 'errors.log'), entry + '\n');
  }
};

const logger = {
  info: (msg, meta={}) => {
    console.log(`ℹ️  ${msg}`);
    logToFile('INFO', msg, meta);
  },
  success: (msg, meta={}) => {
    console.log(`✅ ${msg}`);
    logToFile('SUCCESS', msg, meta);
  },
  warn: (msg, meta={}) => {
    console.warn(`⚠️  ${msg}`);
    logToFile('WARN', msg, meta);
  },
  error: (msg, err='', meta={}) => {
    const detail = err?.message || String(err);
    console.error(`❌ ${msg}`, detail);
    logToFile('ERROR', msg, { error: detail, stack: err?.stack, ...meta });
  },
  http: (method, url, status, ms, meta={}) => {
    const line = `${method} ${url} ${status} - ${ms}ms`;
    const color = status >= 500 ? '🔴' : status >= 400 ? '🟡' : '🌐';
    console.log(`${color} ${line}`);
    logToFile('HTTP', line, { method, url, status, duration: ms, ...meta });
  }
};

module.exports = logger;
