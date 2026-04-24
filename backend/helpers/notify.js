const pool = require('../db');

async function createNotification(userId, type, title, message, link) {
  try {
    await pool.query(
      'INSERT INTO notifications (user_id, type, title, message, link) VALUES ($1,$2,$3,$4,$5)',
      [userId, type, title, message || null, link || null]
    );
  } catch (err) {
    console.error('Notification error:', err.message);
  }
}

module.exports = { createNotification };
