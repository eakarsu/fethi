const fs = require('fs/promises');
const path = require('path');
const pool = require('./db');

async function migrate() {
  const directory = path.join(__dirname, 'migrations');
  const files = (await fs.readdir(directory)).filter((name) => name.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = await fs.readFile(path.join(directory, file), 'utf8');
    await pool.query(sql);
    console.log(`Applied ${file}`);
  }
}

if (require.main === module) {
  migrate().then(() => pool.end()).catch(async (error) => {
    console.error(error.message);
    await pool.end();
    process.exitCode = 1;
  });
}

module.exports = { migrate };
