const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const config = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'require' ? { rejectUnauthorized: true } : undefined,
} : {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rental_marketplace',
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || undefined,
};

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
