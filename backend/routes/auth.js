const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const { getJwtSecret } = require('../middleware/auth');
const router = express.Router();

function issueToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, platformRole: user.platform_role || 'member' },
    getJwtSecret(),
    { algorithm: 'HS256', expiresIn: '2h', issuer: 'fethi-api', audience: 'fethi-web' }
  );
}

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, phone } = req.body;
    if (!email || !/^\S+@\S+\.\S+$/.test(email) || typeof password !== 'string' || password.length < 12) {
      return res.status(400).json({ error: 'Valid email and password of at least 12 characters are required' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (email, password, name, phone) VALUES ($1,$2,$3,$4) RETURNING id, email, name, phone, platform_role',
      [email.toLowerCase(), hashed, name, phone || null]
    );
    const token = issueToken(result.rows[0]);
    res.json({ user: result.rows[0], token });
  } catch (err) {
    if (err.code === '23505') return res.status(400).json({ error: 'Email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = issueToken(user);
    res.json({ user: { id: user.id, email: user.email, name: user.name, phone: user.phone, platformRole: user.platform_role }, token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
