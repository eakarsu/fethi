const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const HOST = process.env.BACKEND_HOST || '127.0.0.1';

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000').split(',').map((origin) => origin.trim());
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  });
  next();
});
app.use(cors({ origin(origin, callback) {
  if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
  return callback(new Error('Origin not allowed'));
} }));

const { router: documentWorkflow, webhookRouter } = require('./routes/documentWorkflow');
app.use('/api/webhooks', webhookRouter);
app.use(express.json({ limit: '1mb' }));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/runtime-ai', require('./routes/runtimeAi'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/subscriptions', require('./routes/subscriptions'));
app.use('/api/documents', documentWorkflow);

app.get('/api/health', async (req, res) => {
  try {
    const pool = require('./db');
    await pool.query('SELECT 1');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

// // === Custom Views feature mount (must precede any 404 handler) ===
app.use('/api/custom-views', require('./routes/customViews'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, req, res, next) => {
  console.error(error.message);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => console.log(`Rental Marketplace API running on http://${HOST}:${PORT}`));
}

module.exports = app;
