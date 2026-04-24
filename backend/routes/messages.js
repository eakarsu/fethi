const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { createNotification } = require('../helpers/notify');
const router = express.Router();

// GET my conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (conversation_partner) *
       FROM (
         SELECT m.*, l.title as listing_title,
           CASE WHEN m.sender_id = $1 THEN m.receiver_id ELSE m.sender_id END as conversation_partner,
           CASE WHEN m.sender_id = $1 THEN ru.name ELSE su.name END as partner_name
         FROM messages m
         JOIN users su ON m.sender_id = su.id
         JOIN users ru ON m.receiver_id = ru.id
         LEFT JOIN listings l ON m.listing_id = l.id
         WHERE m.sender_id = $1 OR m.receiver_id = $1
         ORDER BY m.created_at DESC
       ) sub
       ORDER BY conversation_partner, created_at DESC`, [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all messages
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, su.name as sender_name, ru.name as receiver_name, l.title as listing_title
       FROM messages m
       JOIN users su ON m.sender_id = su.id
       JOIN users ru ON m.receiver_id = ru.id
       LEFT JOIN listings l ON m.listing_id = l.id
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY m.created_at DESC`, [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single message
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, su.name as sender_name, ru.name as receiver_name, l.title as listing_title
       FROM messages m
       JOIN users su ON m.sender_id = su.id
       JOIN users ru ON m.receiver_id = ru.id
       LEFT JOIN listings l ON m.listing_id = l.id
       WHERE m.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST send message
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { receiver_id, listing_id, content } = req.body;
    const result = await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, listing_id, content) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.user.id, receiver_id, listing_id || null, content]
    );
    const sender = await pool.query('SELECT name FROM users WHERE id = $1', [req.user.id]);
    await createNotification(receiver_id, 'message', 'New Message', `${sender.rows[0]?.name || 'Someone'} sent you a message`, '/messages');
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM messages WHERE id=$1 AND sender_id=$2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Message not found or unauthorized' });
    res.json({ message: 'Message deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
