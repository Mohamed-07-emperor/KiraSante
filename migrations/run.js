require('dotenv').config();
const fs   = require('fs');
const path = require('path');
const { Pool } = require('pg');

const pool = new Pool({
  host:     process.env.DB_HOST,
  port:     process.env.DB_PORT,
  database: process.env.DB_NAME,
  user:     process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: false
});

const runMigrations = async () => {
  const files = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`🚀 Exécution de ${files.length} migrations...`);

  for (const file of files) {
    const sql = fs.readFileSync(path.join(__dirname, file), 'utf8');
    try {
      await pool.query(sql);
      console.log(`✅ ${file}`);
    } catch (err) {
      console.error(`❌ ${file} : ${err.message}`);
      process.exit(1);
    }
  }

  console.log('🎉 Toutes les migrations exécutées avec succès !');
  await pool.end();
  process.exit(0);
};

runMigrations();
