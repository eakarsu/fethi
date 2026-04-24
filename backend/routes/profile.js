const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// GET my profile with stats
router.get('/', authenticateToken, async (req, res) => {
  try {
    const user = await pool.query('SELECT id, email, name, phone, created_at FROM users WHERE id = $1', [req.user.id]);
    if (user.rows.length === 0) return res.status(404).json({ error: 'User not found' });

    const listings = await pool.query('SELECT COUNT(*) FROM listings WHERE user_id = $1', [req.user.id]);
    const bookingsAsRenter = await pool.query('SELECT COUNT(*) FROM bookings WHERE renter_id = $1', [req.user.id]);
    const bookingsAsOwner = await pool.query('SELECT COUNT(*) FROM bookings WHERE owner_id = $1', [req.user.id]);
    const reviews = await pool.query('SELECT COUNT(*) FROM reviews WHERE reviewer_id = $1', [req.user.id]);
    const favorites = await pool.query('SELECT COUNT(*) FROM favorites WHERE user_id = $1', [req.user.id]);
    const earnings = await pool.query(
      `SELECT COALESCE(SUM(total_price), 0)::numeric(10,2) as total FROM bookings WHERE owner_id = $1 AND status IN ('confirmed', 'completed')`,
      [req.user.id]
    );
    const avgRating = await pool.query(
      `SELECT AVG(r.rating)::numeric(2,1) as avg FROM reviews r JOIN listings l ON r.listing_id = l.id WHERE l.user_id = $1`,
      [req.user.id]
    );

    res.json({
      ...user.rows[0],
      stats: {
        listings: parseInt(listings.rows[0].count),
        bookings_as_renter: parseInt(bookingsAsRenter.rows[0].count),
        bookings_as_owner: parseInt(bookingsAsOwner.rows[0].count),
        reviews_written: parseInt(reviews.rows[0].count),
        favorites: parseInt(favorites.rows[0].count),
        total_earnings: parseFloat(earnings.rows[0].total),
        avg_listing_rating: parseFloat(avgRating.rows[0].avg) || 0,
      }
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update profile
router.put('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const result = await pool.query(
      'UPDATE users SET name=$1, email=$2, phone=$3 WHERE id=$4 RETURNING id, email, name, phone, created_at',
      [name, email, phone || null, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already taken' });
    res.status(500).json({ error: err.message });
  }
});

// PUT change password
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    const user = await pool.query('SELECT password FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, user.rows[0].password);
    if (!valid) return res.status(400).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(new_password, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, req.user.id]);
    res.json({ message: 'Password updated successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
