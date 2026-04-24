const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', require('./routes/auth'));
app.use('/api/listings', require('./routes/listings'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/reviews', require('./routes/reviews'));
app.use('/api/favorites', require('./routes/favorites'));
app.use('/api/messages', require('./routes/messages'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/profile', require('./routes/profile'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/subscriptions', require('./routes/subscriptions'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Rental Marketplace API running on http://localhost:${PORT}`);
});
