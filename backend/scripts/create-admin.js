const bcrypt = require('bcryptjs');
const pool = require('../db');

async function main() {
  const email = String(process.env.ADMIN_EMAIL || process.env.PROVISION_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || process.env.PROVISION_ADMIN_PASSWORD || '');
  const name = String(process.env.PROVISION_ADMIN_NAME || process.env.BOOTSTRAP_ADMIN_NAME || 'Runtime Administrator').trim();
  if (!email.includes('@') || password.length < 12 || !name) throw new Error('Valid ADMIN_EMAIL, ADMIN_PASSWORD, and administrator name are required');
  const hashed = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users(email,password,name) VALUES($1,$2,$3)
     ON CONFLICT(email) DO UPDATE SET password=EXCLUDED.password,name=EXCLUDED.name
     RETURNING id,email`,
    [email, hashed, name]
  );
  console.log(`Provisioned runtime administrator ${result.rows[0].email}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
}).finally(() => pool.end());
