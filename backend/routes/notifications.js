const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET my notifications
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND read = false',
      [req.user.id]
    );
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT mark as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT mark all as read
router.put('/read-all', authenticateToken, async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET read = true WHERE user_id = $1', [req.user.id]);
    res.json({ message: 'All marked as read' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE notification
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id]);
    res.json({ message: 'Deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
