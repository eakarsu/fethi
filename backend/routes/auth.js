const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { JWT_SECRET } = require('../middleware/auth');
const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name, phone) VALUES ($1,$2,$3,$4) RETURNING id, email, name, phone',
      [email, hashed, name, phone || null]
    );
    const token = jwt.sign({ id: result.rows[0].id, email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: result.rows[0], token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
