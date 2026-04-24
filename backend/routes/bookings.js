const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { createNotification } = require('../helpers/notify');
const router = express.Router();

// GET my bookings (as renter)
router.get('/my-rentals', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, l.title, l.category, l.image_url, l.location, u.name as owner_name
       FROM bookings b JOIN listings l ON b.listing_id = l.id JOIN users u ON b.owner_id = u.id
       WHERE b.renter_id = $1 ORDER BY b.created_at DESC`, [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET bookings for my listings (as owner)
router.get('/my-listings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, l.title, l.category, l.image_url, u.name as renter_name, u.email as renter_email
       FROM bookings b JOIN listings l ON b.listing_id = l.id JOIN users u ON b.renter_id = u.id
       WHERE b.owner_id = $1 ORDER BY b.created_at DESC`, [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all bookings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, l.title, l.category, l.image_url, l.location,
        owner.name as owner_name, renter.name as renter_name
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users owner ON b.owner_id = owner.id
       JOIN users renter ON b.renter_id = renter.id
       ORDER BY b.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single booking
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT b.*, l.title, l.category, l.description as listing_description, l.image_url, l.location, l.price_per_day,
        owner.name as owner_name, owner.email as owner_email, owner.phone as owner_phone,
        renter.name as renter_name, renter.email as renter_email
       FROM bookings b
       JOIN listings l ON b.listing_id = l.id
       JOIN users owner ON b.owner_id = owner.id
       JOIN users renter ON b.renter_id = renter.id
       WHERE b.id = $1`, [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create booking
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { listing_id, start_date, end_date, message } = req.body;
    const listing = await pool.query('SELECT * FROM listings WHERE id = $1', [listing_id]);
    if (listing.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    const l = listing.rows[0];
    const days = Math.ceil((new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24));
    const total_price = days * parseFloat(l.price_per_day);
    const result = await pool.query(
      `INSERT INTO bookings (listing_id, renter_id, owner_id, start_date, end_date, total_price, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [listing_id, req.user.id, l.user_id, start_date, end_date, total_price, message || null]
    );
    await createNotification(l.user_id, 'booking', 'New Booking Request', `You have a new booking request for "${l.title}"`, '/bookings');
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update booking status
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE bookings SET status=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const booking = result.rows[0];
    const statusMsg = { confirmed: 'confirmed', cancelled: 'cancelled', completed: 'completed' };
    if (statusMsg[status]) {
      await createNotification(booking.renter_id, 'booking', `Booking ${statusMsg[status]}`, `Your booking has been ${statusMsg[status]}`, '/bookings');
    }
    res.json(booking);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE booking
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM bookings WHERE id=$1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    res.json({ message: 'Booking deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
