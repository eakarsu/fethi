const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { createNotification } = require('../helpers/notify');
const router = express.Router();

// GET reviews for a listing
router.get('/listing/:listingId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON r.reviewer_id = u.id
       WHERE r.listing_id = $1 ORDER BY r.created_at DESC`, [req.params.listingId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET reviews for multiple listings (bulk)
router.get('/bulk', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.query;
    if (!ids) return res.json([]);
    const idArr = ids.split(',').map(Number).filter(n => !isNaN(n));
    if (idArr.length === 0) return res.json([]);
    const result = await pool.query(
      `SELECT r.*, u.name as reviewer_name FROM reviews r JOIN users u ON r.reviewer_id = u.id
       WHERE r.listing_id = ANY($1) ORDER BY r.created_at DESC`, [idArr]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all reviews
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as reviewer_name, l.title as listing_title, l.category
       FROM reviews r JOIN users u ON r.reviewer_id = u.id JOIN listings l ON r.listing_id = l.id
       ORDER BY r.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single review
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT r.*, u.name as reviewer_name, l.title as listing_title, l.category
       FROM reviews r JOIN users u ON r.reviewer_id = u.id JOIN listings l ON r.listing_id = l.id
       WHERE r.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create review
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { listing_id, booking_id, rating, comment } = req.body;
    const result = await pool.query(
      'INSERT INTO reviews (listing_id, booking_id, reviewer_id, rating, comment) VALUES ($1,$2,$3,$4,$5) RETURNING *',
      [listing_id, booking_id || null, req.user.id, rating, comment]
    );
    // Update listing avg rating
    const avg = await pool.query(
      'SELECT AVG(rating)::numeric(2,1) as avg, COUNT(*) as cnt FROM reviews WHERE listing_id = $1', [listing_id]
    );
    await pool.query('UPDATE listings SET rating=$1, review_count=$2 WHERE id=$3',
      [avg.rows[0].avg, avg.rows[0].cnt, listing_id]
    );
    // Notify listing owner
    const listing = await pool.query('SELECT user_id, title FROM listings WHERE id = $1', [listing_id]);
    if (listing.rows.length > 0 && listing.rows[0].user_id !== req.user.id) {
      await createNotification(listing.rows[0].user_id, 'review', 'New Review', `Your listing "${listing.rows[0].title}" received a ${rating}-star review`, '/browse');
    }
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update review
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const result = await pool.query(
      'UPDATE reviews SET rating=$1, comment=$2 WHERE id=$3 AND reviewer_id=$4 RETURNING *',
      [rating, comment, req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found or unauthorized' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE review
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM reviews WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    res.json({ message: 'Review deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
