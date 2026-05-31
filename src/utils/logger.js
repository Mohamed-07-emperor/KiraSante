const fs = require('fs');
const path = require('path');

const logDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logToFile = (level, message) => {
  const date = new Date().toISOString();
  const line = `[${date}] [${level}] ${message}\n`;
  fs.appendFileSync(path.join(logDir, 'app.log'), line);
};

const logger = {
  info:    (msg) => { console.log(`ℹ️  ${msg}`);    logToFile('INFO', msg); },
  success: (msg) => { console.log(`✅ ${msg}`);     logToFile('SUCCESS', msg); },
  warn:    (msg) => { console.warn(`⚠️  ${msg}`);   logToFile('WARN', msg); },
  error:   (msg, err='') => {
    const d = err?.message || err;
    console.error(`❌ ${msg}`, d);
    logToFile('ERROR', `${msg} ${d}`);
  },
  http: (method, url, status, ms) => {
    const line = `${method} ${url} ${status} - ${ms}ms`;
    console.log(`🌐 ${line}`);
    logToFile('HTTP', line);
  }
};

module.exports = logger;
