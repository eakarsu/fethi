const jwt = require('jsonwebtoken');
require('dotenv').config({ path: '../.env' });

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw Object.assign(new Error('JWT_SECRET must be configured with at least 32 characters'), { statusCode: 503 });
  }
  return secret;
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const [scheme, token] = authHeader ? authHeader.split(' ') : [];
  if (scheme !== 'Bearer') return res.status(401).json({ error: 'Bearer access token required' });
  if (!token) return res.status(401).json({ error: 'Access token required' });

  try {
    req.user = jwt.verify(token, getJwtSecret(), {
      algorithms: ['HS256'],
      issuer: 'fethi-api',
      audience: 'fethi-web',
    });
    next();
  } catch (error) {
    const status = error.statusCode || 403;
    return res.status(status).json({ error: status === 503 ? error.message : 'Invalid or expired token' });
  }
}

module.exports = { authenticateToken, getJwtSecret };
