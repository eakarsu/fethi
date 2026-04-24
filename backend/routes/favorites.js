const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET my favorites
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT f.*, l.title, l.category, l.price_per_day, l.location, l.city, l.image_url, l.rating, l.description, u.name as owner_name
       FROM favorites f JOIN listings l ON f.listing_id = l.id JOIN users u ON l.user_id = u.id
       WHERE f.user_id = $1 ORDER BY f.created_at DESC`, [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST toggle favorite
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { listing_id } = req.body;
    const existing = await pool.query(
      'SELECT * FROM favorites WHERE user_id=$1 AND listing_id=$2', [req.user.id, listing_id]
    );
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM favorites WHERE user_id=$1 AND listing_id=$2', [req.user.id, listing_id]);
      res.json({ favorited: false });
    } else {
      await pool.query('INSERT INTO favorites (user_id, listing_id) VALUES ($1,$2)', [req.user.id, listing_id]);
      res.json({ favorited: true });
    }
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE favorite
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM favorites WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
    res.json({ message: 'Removed from favorites' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
