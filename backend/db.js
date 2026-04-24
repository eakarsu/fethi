const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'rental_marketplace',
  user: process.env.DB_USER || process.env.USER,
};

if (process.env.DB_PASSWORD) {
  config.password = process.env.DB_PASSWORD;
}

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

module.exports = pool;
