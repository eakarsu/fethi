const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { createNotification } = require('../helpers/notify');
const router = express.Router();

// ==================== PLANS ====================

// GET plans for a listing
router.get('/plans/listing/:listingId', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM subscription_plans WHERE listing_id = $1 ORDER BY monthly_price ASC',
      [req.params.listingId]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create plan (owner only)
router.post('/plans', authenticateToken, async (req, res) => {
  try {
    const { listing_id, plan_name, monthly_price, includes_maintenance, includes_repair, includes_parts, includes_inspection, includes_priority_support, max_service_requests, response_time_hours, contract_duration_months, description } = req.body;
    // Verify ownership
    const listing = await pool.query('SELECT * FROM listings WHERE id = $1 AND user_id = $2', [listing_id, req.user.id]);
    if (listing.rows.length === 0) return res.status(403).json({ error: 'Not your listing' });
    const result = await pool.query(
      `INSERT INTO subscription_plans (listing_id, owner_id, plan_name, monthly_price, includes_maintenance, includes_repair, includes_parts, includes_inspection, includes_priority_support, max_service_requests, response_time_hours, contract_duration_months, description)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [listing_id, req.user.id, plan_name, monthly_price, includes_maintenance || false, includes_repair || false, includes_parts || false, includes_inspection || false, includes_priority_support || false, max_service_requests || 5, response_time_hours || 48, contract_duration_months || 3, description || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update plan
router.put('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const plan = await pool.query('SELECT * FROM subscription_plans WHERE id = $1 AND owner_id = $2', [req.params.id, req.user.id]);
    if (plan.rows.length === 0) return res.status(404).json({ error: 'Plan not found or not yours' });
    const { plan_name, monthly_price, includes_maintenance, includes_repair, includes_parts, includes_inspection, includes_priority_support, max_service_requests, response_time_hours, contract_duration_months, description } = req.body;
    const result = await pool.query(
      `UPDATE subscription_plans SET plan_name=$1, monthly_price=$2, includes_maintenance=$3, includes_repair=$4, includes_parts=$5, includes_inspection=$6, includes_priority_support=$7, max_service_requests=$8, response_time_hours=$9, contract_duration_months=$10, description=$11, updated_at=NOW() WHERE id=$12 RETURNING *`,
      [plan_name, monthly_price, includes_maintenance, includes_repair, includes_parts, includes_inspection, includes_priority_support, max_service_requests, response_time_hours, contract_duration_months, description, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE plan
router.delete('/plans/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM subscription_plans WHERE id = $1 AND owner_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Plan not found or not yours' });
    res.json({ message: 'Plan deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== CONTRACTS ====================

// GET user's contracts
router.get('/contracts', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sc.*, l.title as listing_title, l.category, l.image_url,
        owner.name as owner_name, renter.name as renter_name
       FROM service_contracts sc
       JOIN listings l ON sc.listing_id = l.id
       JOIN users owner ON sc.owner_id = owner.id
       JOIN users renter ON sc.renter_id = renter.id
       WHERE sc.renter_id = $1 OR sc.owner_id = $1
       ORDER BY sc.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single contract
router.get('/contracts/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sc.*, l.title as listing_title, l.category, l.image_url, l.location,
        owner.name as owner_name, owner.email as owner_email,
        renter.name as renter_name, renter.email as renter_email
       FROM service_contracts sc
       JOIN listings l ON sc.listing_id = l.id
       JOIN users owner ON sc.owner_id = owner.id
       JOIN users renter ON sc.renter_id = renter.id
       WHERE sc.id = $1 AND (sc.renter_id = $2 OR sc.owner_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create contract
router.post('/contracts', authenticateToken, async (req, res) => {
  try {
    const { booking_id, plan_id } = req.body;
    // Get plan details to snapshot
    const plan = await pool.query('SELECT * FROM subscription_plans WHERE id = $1', [plan_id]);
    if (plan.rows.length === 0) return res.status(404).json({ error: 'Plan not found' });
    const p = plan.rows[0];
    // Get booking for dates
    const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [booking_id]);
    if (booking.rows.length === 0) return res.status(404).json({ error: 'Booking not found' });
    const b = booking.rows[0];
    const startDate = b.start_date;
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + p.contract_duration_months);
    const terms = `Service contract for "${p.plan_name}" plan. Includes: ${[p.includes_maintenance && 'maintenance', p.includes_repair && 'repair', p.includes_parts && 'parts replacement', p.includes_inspection && 'inspection', p.includes_priority_support && 'priority support'].filter(Boolean).join(', ')}. Response time: ${p.response_time_hours} hours. Max ${p.max_service_requests} service requests. Duration: ${p.contract_duration_months} months.`;
    const result = await pool.query(
      `INSERT INTO service_contracts (booking_id, plan_id, listing_id, renter_id, owner_id, plan_name, monthly_price, includes_maintenance, includes_repair, includes_parts, includes_inspection, includes_priority_support, max_service_requests, response_time_hours, contract_duration_months, terms, start_date, end_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [booking_id, plan_id, p.listing_id, req.user.id, p.owner_id, p.plan_name, p.monthly_price, p.includes_maintenance, p.includes_repair, p.includes_parts, p.includes_inspection, p.includes_priority_support, p.max_service_requests, p.response_time_hours, p.contract_duration_months, terms, startDate, endDate.toISOString().split('T')[0]]
    );
    await createNotification(p.owner_id, 'service', 'New Service Contract', `A new ${p.plan_name} service contract has been created for your listing`, '/services');
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update contract (cancel, toggle auto-renew)
router.put('/contracts/:id', authenticateToken, async (req, res) => {
  try {
    const { status, auto_renew } = req.body;
    const contract = await pool.query('SELECT * FROM service_contracts WHERE id = $1 AND (renter_id = $2 OR owner_id = $2)', [req.params.id, req.user.id]);
    if (contract.rows.length === 0) return res.status(404).json({ error: 'Contract not found' });
    const updates = [];
    const vals = [];
    let idx = 1;
    if (status !== undefined) { updates.push(`status=$${idx++}`); vals.push(status); }
    if (auto_renew !== undefined) { updates.push(`auto_renew=$${idx++}`); vals.push(auto_renew); }
    updates.push(`updated_at=NOW()`);
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE service_contracts SET ${updates.join(',')} WHERE id=$${idx} RETURNING *`, vals
    );
    if (status === 'cancelled') {
      const c = contract.rows[0];
      const notifyId = c.renter_id === req.user.id ? c.owner_id : c.renter_id;
      await createNotification(notifyId, 'service', 'Contract Cancelled', `A service contract has been cancelled`, '/services');
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== SERVICE REQUESTS ====================

// GET user's tickets
router.get('/requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.*, l.title as listing_title, l.category,
        owner.name as owner_name, renter.name as renter_name
       FROM service_requests sr
       JOIN listings l ON sr.listing_id = l.id
       JOIN users owner ON sr.owner_id = owner.id
       JOIN users renter ON sr.renter_id = renter.id
       WHERE sr.renter_id = $1 OR sr.owner_id = $1
       ORDER BY sr.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET single ticket with updates
router.get('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT sr.*, l.title as listing_title, l.category,
        owner.name as owner_name, renter.name as renter_name
       FROM service_requests sr
       JOIN listings l ON sr.listing_id = l.id
       JOIN users owner ON sr.owner_id = owner.id
       JOIN users renter ON sr.renter_id = renter.id
       WHERE sr.id = $1 AND (sr.renter_id = $2 OR sr.owner_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const updates = await pool.query(
      `SELECT sru.*, u.name as user_name FROM service_request_updates sru
       JOIN users u ON sru.user_id = u.id
       WHERE sru.request_id = $1 ORDER BY sru.created_at ASC`,
      [req.params.id]
    );
    res.json({ ...result.rows[0], updates: updates.rows });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create ticket
router.post('/requests', authenticateToken, async (req, res) => {
  try {
    const { contract_id, type, priority, title, description, estimated_cost } = req.body;
    // Verify contract exists and is active
    const contract = await pool.query('SELECT * FROM service_contracts WHERE id = $1 AND renter_id = $2 AND status = $3', [contract_id, req.user.id, 'active']);
    if (contract.rows.length === 0) return res.status(400).json({ error: 'No active contract found' });
    const c = contract.rows[0];
    // Check entitlements
    if (type === 'maintenance' && !c.includes_maintenance) return res.status(400).json({ error: 'Maintenance not included in your plan' });
    if (type === 'repair' && !c.includes_repair) return res.status(400).json({ error: 'Repair not included in your plan' });
    if (type === 'parts_replacement' && !c.includes_parts) return res.status(400).json({ error: 'Parts replacement not included in your plan' });
    if (type === 'inspection' && !c.includes_inspection) return res.status(400).json({ error: 'Inspection not included in your plan' });
    // Check request limit
    const countResult = await pool.query('SELECT COUNT(*) FROM service_requests WHERE contract_id = $1', [contract_id]);
    if (parseInt(countResult.rows[0].count) >= c.max_service_requests) return res.status(400).json({ error: `Request limit reached (${c.max_service_requests})` });
    const result = await pool.query(
      `INSERT INTO service_requests (contract_id, listing_id, renter_id, owner_id, type, priority, title, description, estimated_cost)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [contract_id, c.listing_id, req.user.id, c.owner_id, type, priority || 'medium', title, description || null, estimated_cost || null]
    );
    await createNotification(c.owner_id, 'service', 'New Service Request', `New ${priority || 'medium'} priority ${type} request: "${title}"`, '/services');
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update ticket status/resolution
router.put('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const { status, actual_cost } = req.body;
    const request = await pool.query('SELECT * FROM service_requests WHERE id = $1 AND (renter_id = $2 OR owner_id = $2)', [req.params.id, req.user.id]);
    if (request.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const updates = [];
    const vals = [];
    let idx = 1;
    if (status) {
      updates.push(`status=$${idx++}`); vals.push(status);
      if (status === 'in_progress') { updates.push(`assigned_at=NOW()`); }
      if (status === 'resolved') { updates.push(`resolved_at=NOW()`); }
      if (status === 'closed') { updates.push(`closed_at=NOW()`); }
    }
    if (actual_cost !== undefined) { updates.push(`actual_cost=$${idx++}`); vals.push(actual_cost); }
    updates.push(`updated_at=NOW()`);
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE service_requests SET ${updates.join(',')} WHERE id=$${idx} RETURNING *`, vals
    );
    // Notify the other party
    const r = request.rows[0];
    const notifyId = r.renter_id === req.user.id ? r.owner_id : r.renter_id;
    if (status) {
      await createNotification(notifyId, 'service', 'Service Request Updated', `Request "${r.title}" status changed to ${status}`, '/services');
    }
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST add comment to ticket
router.post('/requests/:id/updates', authenticateToken, async (req, res) => {
  try {
    const { comment, new_status } = req.body;
    const request = await pool.query('SELECT * FROM service_requests WHERE id = $1 AND (renter_id = $2 OR owner_id = $2)', [req.params.id, req.user.id]);
    if (request.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    const result = await pool.query(
      'INSERT INTO service_request_updates (request_id, user_id, comment, new_status) VALUES ($1,$2,$3,$4) RETURNING *',
      [req.params.id, req.user.id, comment, new_status || null]
    );
    // If status change included, update the request too
    if (new_status) {
      if (!['open', 'in_progress', 'resolved', 'closed'].includes(new_status)) {
        return res.status(400).json({ error: 'Invalid request status' });
      }
      const statusUpdates = ['status=$2', 'updated_at=NOW()'];
      if (new_status === 'in_progress') statusUpdates.push('assigned_at=NOW()');
      if (new_status === 'resolved') statusUpdates.push('resolved_at=NOW()');
      if (new_status === 'closed') statusUpdates.push('closed_at=NOW()');
      await pool.query(`UPDATE service_requests SET ${statusUpdates.join(',')} WHERE id=$1`, [req.params.id, new_status]);
    }
    // Notify the other party
    const r = request.rows[0];
    const notifyId = r.renter_id === req.user.id ? r.owner_id : r.renter_id;
    await createNotification(notifyId, 'service', 'New Update on Service Request', `New comment on "${r.title}"`, '/services');
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE ticket
router.delete('/requests/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM service_requests WHERE id = $1 AND (renter_id = $2 OR owner_id = $2) RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Request not found' });
    res.json({ message: 'Request deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== MAINTENANCE ====================

// GET maintenance schedules
router.get('/maintenance', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ms.*, l.title as listing_title, l.category,
        sc.renter_id, renter.name as renter_name
       FROM maintenance_schedules ms
       JOIN listings l ON ms.listing_id = l.id
       JOIN service_contracts sc ON ms.contract_id = sc.id
       JOIN users renter ON sc.renter_id = renter.id
       WHERE ms.owner_id = $1 OR sc.renter_id = $1
       ORDER BY ms.next_due_date ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST create maintenance schedule
router.post('/maintenance', authenticateToken, async (req, res) => {
  try {
    const { contract_id, title, description, frequency, next_due_date } = req.body;
    const contract = await pool.query('SELECT * FROM service_contracts WHERE id = $1 AND owner_id = $2', [contract_id, req.user.id]);
    if (contract.rows.length === 0) return res.status(403).json({ error: 'Contract not found or not yours' });
    const c = contract.rows[0];
    const result = await pool.query(
      `INSERT INTO maintenance_schedules (contract_id, listing_id, owner_id, title, description, frequency, next_due_date)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [contract_id, c.listing_id, req.user.id, title, description || null, frequency, next_due_date]
    );
    await createNotification(c.renter_id, 'service', 'New Maintenance Scheduled', `Maintenance "${title}" has been scheduled`, '/services');
    res.status(201).json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT update/mark completed
router.put('/maintenance/:id', authenticateToken, async (req, res) => {
  try {
    const { status, next_due_date, title, description } = req.body;
    const schedule = await pool.query(
      `SELECT ms.*, sc.renter_id FROM maintenance_schedules ms
       JOIN service_contracts sc ON ms.contract_id = sc.id
       WHERE ms.id = $1 AND (ms.owner_id = $2 OR sc.renter_id = $2)`,
      [req.params.id, req.user.id]
    );
    if (schedule.rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
    const updates = [];
    const vals = [];
    let idx = 1;
    if (status) {
      updates.push(`status=$${idx++}`); vals.push(status);
      if (status === 'completed') updates.push('last_completed_date=CURRENT_DATE');
    }
    if (next_due_date) { updates.push(`next_due_date=$${idx++}`); vals.push(next_due_date); }
    if (title) { updates.push(`title=$${idx++}`); vals.push(title); }
    if (description !== undefined) { updates.push(`description=$${idx++}`); vals.push(description); }
    updates.push('updated_at=NOW()');
    vals.push(req.params.id);
    const result = await pool.query(
      `UPDATE maintenance_schedules SET ${updates.join(',')} WHERE id=$${idx} RETURNING *`, vals
    );
    res.json(result.rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE maintenance schedule
router.delete('/maintenance/:id', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM maintenance_schedules WHERE id = $1 AND owner_id = $2 RETURNING *', [req.params.id, req.user.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found or not yours' });
    res.json({ message: 'Schedule deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==================== DASHBOARD ====================

router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Open tickets count
    const openTickets = await pool.query(
      `SELECT COUNT(*) FROM service_requests WHERE (renter_id=$1 OR owner_id=$1) AND status IN ('open','in_progress')`, [userId]
    );

    // Average resolution time (hours)
    const avgResolution = await pool.query(
      `SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - opened_at))/3600)::numeric(10,1) as avg_hours
       FROM service_requests WHERE (renter_id=$1 OR owner_id=$1) AND resolved_at IS NOT NULL`, [userId]
    );

    // Active contracts
    const activeContracts = await pool.query(
      `SELECT COUNT(*) FROM service_contracts WHERE (renter_id=$1 OR owner_id=$1) AND status='active'`, [userId]
    );

    // Expiring soon (within 30 days)
    const expiringSoon = await pool.query(
      `SELECT COUNT(*) FROM service_contracts WHERE (renter_id=$1 OR owner_id=$1) AND status='active' AND end_date <= CURRENT_DATE + INTERVAL '30 days'`, [userId]
    );

    // Maintenance due (within 7 days or overdue)
    const maintenanceDue = await pool.query(
      `SELECT COUNT(*) FROM maintenance_schedules ms
       JOIN service_contracts sc ON ms.contract_id = sc.id
       WHERE (ms.owner_id=$1 OR sc.renter_id=$1) AND ms.status IN ('scheduled','overdue') AND ms.next_due_date <= CURRENT_DATE + INTERVAL '7 days'`, [userId]
    );

    // Total service costs
    const serviceCosts = await pool.query(
      `SELECT COALESCE(SUM(actual_cost),0)::numeric(10,2) as total FROM service_requests WHERE (renter_id=$1 OR owner_id=$1) AND actual_cost IS NOT NULL`, [userId]
    );

    // Breakdown by type
    const byType = await pool.query(
      `SELECT type, COUNT(*) as count FROM service_requests WHERE renter_id=$1 OR owner_id=$1 GROUP BY type ORDER BY count DESC`, [userId]
    );

    // Breakdown by priority
    const byPriority = await pool.query(
      `SELECT priority, COUNT(*) as count FROM service_requests WHERE renter_id=$1 OR owner_id=$1 GROUP BY priority ORDER BY count DESC`, [userId]
    );

    // Recent open tickets
    const recentOpen = await pool.query(
      `SELECT sr.*, l.title as listing_title FROM service_requests sr
       JOIN listings l ON sr.listing_id = l.id
       WHERE (sr.renter_id=$1 OR sr.owner_id=$1) AND sr.status IN ('open','in_progress')
       ORDER BY sr.created_at DESC LIMIT 5`, [userId]
    );

    // Upcoming maintenance
    const upcomingMaint = await pool.query(
      `SELECT ms.*, l.title as listing_title FROM maintenance_schedules ms
       JOIN listings l ON ms.listing_id = l.id
       JOIN service_contracts sc ON ms.contract_id = sc.id
       WHERE (ms.owner_id=$1 OR sc.renter_id=$1) AND ms.status IN ('scheduled','overdue')
       ORDER BY ms.next_due_date ASC LIMIT 5`, [userId]
    );

    res.json({
      open_tickets: parseInt(openTickets.rows[0].count),
      avg_resolution_hours: parseFloat(avgResolution.rows[0].avg_hours) || 0,
      active_contracts: parseInt(activeContracts.rows[0].count),
      expiring_soon: parseInt(expiringSoon.rows[0].count),
      maintenance_due: parseInt(maintenanceDue.rows[0].count),
      service_costs: parseFloat(serviceCosts.rows[0].total),
      by_type: byType.rows,
      by_priority: byPriority.rows,
      recent_open: recentOpen.rows,
      upcoming_maintenance: upcomingMaint.rows,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
