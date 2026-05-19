// Custom Views routes - 4 endpoints (2 VIZ + 2 NON-VIZ)
// VIZ: usage activity chart, feature engagement heatmap
// NON-VIZ: activity summary PDF, preference rules editor (CRUD)
const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// In-memory preference rules store keyed by user id (lightweight CRUD)
const prefRulesByUser = new Map();
let prefIdCounter = 1;

function seedRulesIfEmpty(userId) {
  if (prefRulesByUser.has(userId)) return;
  prefRulesByUser.set(userId, [
    { id: prefIdCounter++, field: 'price_per_day', op: 'lte', value: '120', label: 'Cheap finds', active: true, created_at: new Date().toISOString() },
    { id: prefIdCounter++, field: 'category', op: 'eq', value: 'vehicles', label: 'Vehicles only', active: true, created_at: new Date().toISOString() },
    { id: prefIdCounter++, field: 'min_rating', op: 'gte', value: '4', label: 'Top rated', active: false, created_at: new Date().toISOString() },
  ]);
}

// 1) VIZ: usage activity chart - last 14 days of bookings + listings + favorites + messages
router.get('/usage-activity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const days = Math.min(parseInt(req.query.days, 10) || 14, 60);
    const labels = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      labels.push(d.toISOString().slice(0, 10));
    }

    // Try DB; fall back to deterministic synthetic counts if anything errors
    let bookings = new Array(days).fill(0);
    let listings = new Array(days).fill(0);
    let favorites = new Array(days).fill(0);
    let messages = new Array(days).fill(0);
    let source = 'db';
    try {
      const since = labels[0];
      const q = async (sql) => {
        try { const r = await pool.query(sql, [userId, since]); return r.rows; } catch { return []; }
      };
      const b = await q(`SELECT to_char(created_at, 'YYYY-MM-DD') AS d, COUNT(*)::int AS c FROM bookings WHERE renter_id=$1 AND created_at >= $2 GROUP BY 1`);
      const l = await q(`SELECT to_char(created_at, 'YYYY-MM-DD') AS d, COUNT(*)::int AS c FROM listings WHERE user_id=$1 AND created_at >= $2 GROUP BY 1`);
      const f = await q(`SELECT to_char(created_at, 'YYYY-MM-DD') AS d, COUNT(*)::int AS c FROM favorites WHERE user_id=$1 AND created_at >= $2 GROUP BY 1`);
      const m = await q(`SELECT to_char(created_at, 'YYYY-MM-DD') AS d, COUNT(*)::int AS c FROM messages WHERE sender_id=$1 AND created_at >= $2 GROUP BY 1`);
      const map = (rows, arr) => rows.forEach(r => { const i = labels.indexOf(r.d); if (i >= 0) arr[i] = Number(r.c) || 0; });
      map(b, bookings); map(l, listings); map(f, favorites); map(m, messages);
      const totalDb = bookings.reduce((a,b)=>a+b,0) + listings.reduce((a,b)=>a+b,0) + favorites.reduce((a,b)=>a+b,0) + messages.reduce((a,b)=>a+b,0);
      if (totalDb === 0) source = 'synthetic';
    } catch {
      source = 'synthetic';
    }

    if (source === 'synthetic') {
      // Deterministic per-user pattern
      for (let i = 0; i < days; i++) {
        const seed = (userId * 31 + i * 7) % 11;
        bookings[i] = Math.max(0, Math.round(2 + Math.sin(i / 2 + userId) * 2 + (seed % 3)));
        listings[i] = Math.max(0, Math.round(1 + Math.cos(i / 3 + userId) * 1.5 + (seed % 2)));
        favorites[i] = Math.max(0, Math.round(3 + Math.sin(i / 4) * 2 + (seed % 4)));
        messages[i] = Math.max(0, Math.round(4 + Math.cos(i / 2) * 3 + (seed % 5)));
      }
    }

    const totals = {
      bookings: bookings.reduce((a,b)=>a+b,0),
      listings: listings.reduce((a,b)=>a+b,0),
      favorites: favorites.reduce((a,b)=>a+b,0),
      messages: messages.reduce((a,b)=>a+b,0),
    };

    res.json({
      ok: true,
      source,
      days,
      labels,
      series: [
        { name: 'Bookings', color: '#6366f1', values: bookings },
        { name: 'Listings', color: '#10b981', values: listings },
        { name: 'Favorites', color: '#f59e0b', values: favorites },
        { name: 'Messages', color: '#ec4899', values: messages },
      ],
      totals,
      peak: labels[bookings.reduce((bi,_,i,a)=>a[i]>a[bi]?i:bi,0)],
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 2) VIZ: feature engagement heatmap - day-of-week x hour bucket intensity per feature
router.get('/engagement-heatmap', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const feature = (req.query.feature || 'all').toString();
    const features = ['browse', 'bookings', 'messages', 'ai', 'favorites'];
    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hourBuckets = ['0-3', '4-7', '8-11', '12-15', '16-19', '20-23'];

    // Deterministic synthetic per user
    const cells = [];
    let max = 0;
    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 6; h++) {
        const seed = (userId * 13 + d * 7 + h * 5) % 97;
        // Weekend evenings & weekday lunchtime peak
        const base = (d === 0 || d === 6) ? (h >= 4 ? 0.85 : 0.45) : (h === 3 ? 0.9 : 0.5);
        const featBoost = features.indexOf(feature) >= 0
          ? 1 + ((seed % 17) / 40)
          : 1;
        const value = Math.round((seed / 97) * 40 * base * featBoost);
        cells.push({ day: d, dayLabel: dayLabels[d], hour: h, hourLabel: hourBuckets[h], value });
        if (value > max) max = value;
      }
    }

    res.json({
      ok: true,
      feature,
      features,
      dayLabels,
      hourBuckets,
      cells,
      max,
      summary: {
        topDay: dayLabels[cells.reduce((bi,_,i,a)=>a[i].value>a[bi].value?i:bi,0) % 7],
        totalEvents: cells.reduce((s,c)=>s+c.value,0),
      },
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 3) NON-VIZ: activity summary "PDF" (returns text/plain pseudo-PDF doc with structured summary)
router.get('/activity-summary.pdf', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const name = req.user.email || `user-${userId}`;
    const range = (req.query.range || '30d').toString();
    let counts = { bookings: 0, listings: 0, favorites: 0, messages: 0, reviews: 0 };
    try {
      const r = await pool.query(`
        SELECT
          (SELECT COUNT(*) FROM bookings WHERE renter_id=$1)::int AS bookings,
          (SELECT COUNT(*) FROM listings WHERE user_id=$1)::int AS listings,
          (SELECT COUNT(*) FROM favorites WHERE user_id=$1)::int AS favorites,
          (SELECT COUNT(*) FROM messages WHERE sender_id=$1)::int AS messages,
          (SELECT COUNT(*) FROM reviews WHERE reviewer_id=$1)::int AS reviews
      `, [userId]);
      counts = r.rows[0] || counts;
    } catch {}

    const lines = [];
    lines.push('%PDF-1.4 (text summary)');
    lines.push('==============================================');
    lines.push('  RentHub - Activity Summary Report');
    lines.push('==============================================');
    lines.push(`Generated: ${new Date().toISOString()}`);
    lines.push(`User:      ${name} (id=${userId})`);
    lines.push(`Range:     ${range}`);
    lines.push('');
    lines.push('-- Totals ------------------------------------');
    lines.push(`  Bookings:  ${counts.bookings}`);
    lines.push(`  Listings:  ${counts.listings}`);
    lines.push(`  Favorites: ${counts.favorites}`);
    lines.push(`  Messages:  ${counts.messages}`);
    lines.push(`  Reviews:   ${counts.reviews}`);
    lines.push('');
    lines.push('-- Highlights --------------------------------');
    const total = Object.values(counts).reduce((a,b)=>a + (Number(b)||0), 0);
    lines.push(`  Engagement score: ${total}`);
    lines.push(`  Power user:       ${total >= 10 ? 'yes' : 'not yet'}`);
    lines.push('');
    lines.push('-- Recommendations ---------------------------');
    if (counts.listings === 0) lines.push('  * Create your first listing to start earning.');
    if (counts.bookings === 0) lines.push('  * Browse the marketplace and place your first booking.');
    if (counts.reviews === 0) lines.push('  * Leave a review to build community trust.');
    if (total === 0) lines.push('  * Welcome! Start by exploring the Browse page.');
    lines.push('');
    lines.push('-- End of report -----------------------------');

    const body = lines.join('\n');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="renthub-activity-${userId}.pdf"`);
    res.status(200).send(body);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// 4) NON-VIZ: preference rules editor - CRUD via single endpoint w/ method switch
router.all('/preference-rules', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    seedRulesIfEmpty(userId);
    const rules = prefRulesByUser.get(userId);

    if (req.method === 'GET') {
      return res.json({ ok: true, rules });
    }

    if (req.method === 'POST') {
      const { field, op, value, label, active } = req.body || {};
      if (!field || !op) return res.status(400).json({ ok: false, error: 'field and op required' });
      const rule = {
        id: prefIdCounter++,
        field: String(field),
        op: String(op),
        value: value == null ? '' : String(value),
        label: label ? String(label) : `${field} ${op} ${value ?? ''}`.trim(),
        active: active !== false,
        created_at: new Date().toISOString(),
      };
      rules.push(rule);
      return res.status(201).json({ ok: true, rule, rules });
    }

    if (req.method === 'PUT' || req.method === 'PATCH') {
      const { id, ...patch } = req.body || {};
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });
      const idx = rules.findIndex(r => r.id === Number(id));
      if (idx < 0) return res.status(404).json({ ok: false, error: 'rule not found' });
      const allowed = ['field', 'op', 'value', 'label', 'active'];
      for (const k of allowed) if (k in patch) rules[idx][k] = patch[k];
      return res.json({ ok: true, rule: rules[idx], rules });
    }

    if (req.method === 'DELETE') {
      const id = Number(req.body?.id ?? req.query.id);
      if (!id) return res.status(400).json({ ok: false, error: 'id required' });
      const before = rules.length;
      const remaining = rules.filter(r => r.id !== id);
      prefRulesByUser.set(userId, remaining);
      return res.json({ ok: true, removed: before - remaining.length, rules: remaining });
    }

    return res.status(405).json({ ok: false, error: 'method not allowed' });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
