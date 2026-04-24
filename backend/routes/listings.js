const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

// Helper: build WHERE clause from filters
function buildWhere(filters) {
  const params = [];
  let idx = 1;
  let where = ' WHERE 1=1';
  if (filters.category) { where += ` AND l.category = $${idx++}`; params.push(filters.category); }
  if (filters.subcategory) { where += ` AND l.subcategory = $${idx++}`; params.push(filters.subcategory); }
  if (filters.search) { where += ` AND (l.title ILIKE $${idx} OR l.description ILIKE $${idx})`; params.push(`%${filters.search}%`); idx++; }
  if (filters.min_price) { where += ` AND l.price_per_day >= $${idx++}`; params.push(filters.min_price); }
  if (filters.max_price) { where += ` AND l.price_per_day <= $${idx++}`; params.push(filters.max_price); }
  if (filters.conditions) {
    const condArr = filters.conditions.split(',').map(c => c.trim()).filter(Boolean);
    if (condArr.length > 0) { where += ` AND l.item_condition = ANY($${idx++})`; params.push(condArr); }
  } else if (filters.condition) {
    where += ` AND l.item_condition = $${idx++}`; params.push(filters.condition);
  }
  if (filters.min_rating) { where += ` AND l.rating >= $${idx++}`; params.push(filters.min_rating); }
  if (filters.cities) {
    const cityArr = filters.cities.split(',').map(c => c.trim()).filter(Boolean);
    if (cityArr.length > 0) { where += ` AND l.city = ANY($${idx++})`; params.push(cityArr); }
  } else if (filters.city) {
    where += ` AND l.city ILIKE $${idx++}`; params.push(`%${filters.city}%`);
  }
  if (filters.availability) { where += ` AND l.availability_status = $${idx++}`; params.push(filters.availability); }
  if (filters.has_weekly === 'true') { where += ' AND l.price_per_week IS NOT NULL'; }
  if (filters.has_monthly === 'true') { where += ' AND l.price_per_month IS NOT NULL'; }
  if (filters.owners) {
    const ownerArr = filters.owners.split(',').map(c => c.trim()).filter(Boolean).map(Number);
    if (ownerArr.length > 0) { where += ` AND l.user_id = ANY($${idx++})`; params.push(ownerArr); }
  }
  if (filters.has_reviews === 'true') { where += ' AND l.review_count > 0'; }
  if (filters.min_views) { where += ` AND l.views >= $${idx++}`; params.push(filters.min_views); }
  if (filters.listed_within) {
    const days = parseInt(filters.listed_within);
    if (days > 0) { where += ` AND l.created_at >= NOW() - INTERVAL '${days} days'`; }
  }
  if (filters.feature) { where += ` AND l.features ILIKE $${idx++}`; params.push(`%${filters.feature}%`); }
  return { where, params };
}

// Helper: build independent filter query (excludes specified keys so counts stay independent)
function indep(filters, ...excludeKeys) {
  const f = { ...filters };
  excludeKeys.forEach(k => delete f[k]);
  return buildWhere(f);
}

// GET filter options with counts (each section's counts are independent of its own filter)
router.get('/filters', authenticateToken, async (req, res) => {
  try {
    const filters = req.query;
    const { where, params } = buildWhere(filters);
    const base = `FROM listings l ${where}`;

    // Each filter excludes itself so counts remain independent
    const catW = indep(filters, 'category', 'subcategory');
    const subW = indep(filters, 'subcategory');
    const condW = indep(filters, 'conditions', 'condition');
    const cityW = indep(filters, 'cities', 'city');
    const priceW = indep(filters, 'min_price', 'max_price');
    const ratingW = indep(filters, 'min_rating');
    const availW = indep(filters, 'availability');
    const ownerW = indep(filters, 'owners');
    const reviewW = indep(filters, 'has_reviews');
    const pricingW = indep(filters, 'has_weekly', 'has_monthly');
    const featureW = indep(filters, 'feature');

    const [categories, subcategories, conditions, cities, priceRange, ratings, availability, owners, reviewCounts, weeklyCount, monthlyCount] = await Promise.all([
      pool.query(`SELECT l.category as value, COUNT(*) as count FROM listings l ${catW.where} GROUP BY l.category ORDER BY count DESC`, catW.params),
      filters.category ? pool.query(`SELECT l.subcategory as value, COUNT(*) as count FROM listings l ${subW.where} AND l.subcategory IS NOT NULL GROUP BY l.subcategory ORDER BY count DESC`, subW.params) : Promise.resolve({ rows: [] }),
      pool.query(`SELECT l.item_condition as value, COUNT(*) as count FROM listings l ${condW.where} GROUP BY l.item_condition ORDER BY count DESC`, condW.params),
      pool.query(`SELECT l.city as value, COUNT(*) as count FROM listings l ${cityW.where} GROUP BY l.city ORDER BY count DESC`, cityW.params),
      pool.query(`SELECT MIN(l.price_per_day)::numeric(10,2) as min, MAX(l.price_per_day)::numeric(10,2) as max FROM listings l ${priceW.where}`, priceW.params),
      pool.query(`SELECT CASE WHEN l.rating >= 4 THEN '4+' WHEN l.rating >= 3 THEN '3+' WHEN l.rating >= 2 THEN '2+' WHEN l.rating >= 1 THEN '1+' ELSE '0' END as value, COUNT(*) as count FROM listings l ${ratingW.where} GROUP BY value ORDER BY value DESC`, ratingW.params),
      pool.query(`SELECT l.availability_status as value, COUNT(*) as count FROM listings l ${availW.where} GROUP BY l.availability_status ORDER BY count DESC`, availW.params),
      pool.query(`SELECT u.id, u.name as value, COUNT(*) as count FROM listings l JOIN users u ON l.user_id = u.id ${ownerW.where} GROUP BY u.id, u.name ORDER BY count DESC`, ownerW.params),
      pool.query(`SELECT CASE WHEN l.review_count > 0 THEN 'Has Reviews' ELSE 'No Reviews' END as value, COUNT(*) as count FROM listings l ${reviewW.where} GROUP BY value ORDER BY value DESC`, reviewW.params),
      pool.query(`SELECT COUNT(*) as count FROM listings l ${pricingW.where} AND l.price_per_week IS NOT NULL`, pricingW.params),
      pool.query(`SELECT COUNT(*) as count FROM listings l ${pricingW.where} AND l.price_per_month IS NOT NULL`, pricingW.params),
    ]);

    const totalResult = await pool.query(`SELECT COUNT(*) as count ${base}`, params);

    // Extract common features (independent of feature filter)
    const featuresResult = await pool.query(`SELECT l.features FROM listings l ${featureW.where} AND l.features IS NOT NULL`, featureW.params);
    const featureMap = {};
    featuresResult.rows.forEach(r => {
      if (r.features) r.features.split(',').map(f => f.trim()).filter(Boolean).forEach(f => {
        featureMap[f] = (featureMap[f] || 0) + 1;
      });
    });
    const features = Object.entries(featureMap).sort((a, b) => b[1] - a[1]).slice(0, 20).map(([value, count]) => ({ value, count }));

    res.json({
      total: parseInt(totalResult.rows[0].count),
      categories: categories.rows,
      subcategories: subcategories.rows,
      conditions: conditions.rows,
      cities: cities.rows,
      priceRange: { min: parseFloat(priceRange.rows[0]?.min) || 0, max: parseFloat(priceRange.rows[0]?.max) || 0 },
      ratings: ratings.rows,
      availability: availability.rows,
      owners: owners.rows,
      reviewCounts: reviewCounts.rows,
      features,
      weeklyCount: parseInt(weeklyCount.rows[0]?.count) || 0,
      monthlyCount: parseInt(monthlyCount.rows[0]?.count) || 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET all listings (with optional filters)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const filters = req.query;
    const { where, params } = buildWhere(filters);
    const sortMap = {
      'price_asc': 'l.price_per_day ASC',
      'price_desc': 'l.price_per_day DESC',
      'rating': 'l.rating DESC NULLS LAST',
      'newest': 'l.created_at DESC',
      'views': 'l.views DESC',
      'reviews': 'l.review_count DESC',
    };
    const order = sortMap[filters.sort] || 'l.created_at DESC';
    const query = `SELECT l.*, u.name as owner_name FROM listings l JOIN users u ON l.user_id = u.id ${where} ORDER BY ${order}`;
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET my listings
router.get('/mine', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM listings WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single listing
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT l.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone FROM listings l JOIN users u ON l.user_id = u.id WHERE l.id = $1',
      [req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found' });
    // increment views
    await pool.query('UPDATE listings SET views = views + 1 WHERE id = $1', [req.params.id]);
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create listing
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, image_url } = req.body;
    const result = await pool.query(
      `INSERT INTO listings (user_id, title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, image_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [req.user.id, title, description, category, subcategory, price_per_day, price_per_week || null, price_per_month || null, location, city, item_condition, features, rules, image_url || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update listing
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, image_url, availability_status } = req.body;
    const result = await pool.query(
      `UPDATE listings SET title=$1, description=$2, category=$3, subcategory=$4, price_per_day=$5, price_per_week=$6, price_per_month=$7, location=$8, city=$9, item_condition=$10, features=$11, rules=$12, image_url=$13, availability_status=$14, updated_at=NOW()
       WHERE id=$15 AND user_id=$16 RETURNING *`,
      [title, description, category, subcategory, price_per_day, price_per_week, price_per_month, location, city, item_condition, features, rules, image_url, availability_status || 'available', req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found or unauthorized' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE listing
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM listings WHERE id=$1 AND user_id=$2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Listing not found or unauthorized' });
    res.json({ message: 'Listing deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET my analytics (host dashboard)
router.get('/stats/my-analytics', authenticateToken, async (req, res) => {
  try {
    const myListings = await pool.query('SELECT * FROM listings WHERE user_id = $1 ORDER BY views DESC', [req.user.id]);
    const totalEarnings = await pool.query(
      `SELECT COALESCE(SUM(total_price), 0)::numeric(10,2) as total FROM bookings WHERE owner_id = $1 AND status IN ('confirmed','completed')`,
      [req.user.id]
    );
    const monthlyEarnings = await pool.query(
      `SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(total_price)::numeric(10,2) as total
       FROM bookings WHERE owner_id = $1 AND status IN ('confirmed','completed')
       GROUP BY month ORDER BY month DESC LIMIT 6`,
      [req.user.id]
    );
    const bookingsByStatus = await pool.query(
      `SELECT status, COUNT(*) as count FROM bookings WHERE owner_id = $1 GROUP BY status`,
      [req.user.id]
    );
    const recentBookings = await pool.query(
      `SELECT b.*, l.title, u.name as renter_name FROM bookings b
       JOIN listings l ON b.listing_id = l.id JOIN users u ON b.renter_id = u.id
       WHERE b.owner_id = $1 ORDER BY b.created_at DESC LIMIT 5`,
      [req.user.id]
    );
    const recentReviews = await pool.query(
      `SELECT r.*, l.title as listing_title, u.name as reviewer_name FROM reviews r
       JOIN listings l ON r.listing_id = l.id JOIN users u ON r.reviewer_id = u.id
       WHERE l.user_id = $1 ORDER BY r.created_at DESC LIMIT 5`,
      [req.user.id]
    );
    const totalViews = await pool.query(
      'SELECT COALESCE(SUM(views), 0) as total FROM listings WHERE user_id = $1', [req.user.id]
    );
    // Renter stats
    const myRentals = await pool.query(
      `SELECT b.*, l.title, u.name as owner_name FROM bookings b
       JOIN listings l ON b.listing_id = l.id JOIN users u ON b.owner_id = u.id
       WHERE b.renter_id = $1 ORDER BY b.created_at DESC LIMIT 5`,
      [req.user.id]
    );
    const totalSpent = await pool.query(
      `SELECT COALESCE(SUM(total_price), 0)::numeric(10,2) as total FROM bookings WHERE renter_id = $1 AND status IN ('confirmed','completed')`,
      [req.user.id]
    );
    const rentalsByStatus = await pool.query(
      `SELECT status, COUNT(*) as count FROM bookings WHERE renter_id = $1 GROUP BY status`,
      [req.user.id]
    );

    res.json({
      listings: myListings.rows,
      total_earnings: parseFloat(totalEarnings.rows[0].total),
      monthly_earnings: monthlyEarnings.rows,
      bookings_by_status: bookingsByStatus.rows,
      recent_bookings: recentBookings.rows,
      recent_reviews: recentReviews.rows,
      total_views: parseInt(totalViews.rows[0].total),
      my_rentals: myRentals.rows,
      total_spent: parseFloat(totalSpent.rows[0].total),
      rentals_by_status: rentalsByStatus.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET stats
router.get('/stats/overview', authenticateToken, async (req, res) => {
  try {
    const totalListings = await pool.query('SELECT COUNT(*) FROM listings');
    const categories = await pool.query('SELECT category, COUNT(*) as count FROM listings GROUP BY category ORDER BY count DESC');
    const avgPrice = await pool.query('SELECT AVG(price_per_day)::numeric(10,2) as avg_price FROM listings');
    const totalBookings = await pool.query('SELECT COUNT(*) FROM bookings');
    const totalReviews = await pool.query('SELECT COUNT(*) FROM reviews');
    res.json({
      total_listings: parseInt(totalListings.rows[0].count),
      categories: categories.rows,
      avg_daily_price: parseFloat(avgPrice.rows[0].avg_price) || 0,
      total_bookings: parseInt(totalBookings.rows[0].count),
      total_reviews: parseInt(totalReviews.rows[0].count),
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
