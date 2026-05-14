// Custom feature endpoints (batch_09 audit suggestions)
const express = require('express');
const https = require('https');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config({ path: '../.env' });
const router = express.Router();

const MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';

function callLLM(system, user, maxTokens = 1700, temperature = 0.4) {
  return new Promise((resolve, reject) => {
    if (!process.env.OPENROUTER_API_KEY) {
      const e = new Error('OPENROUTER_API_KEY missing'); e.statusCode = 503; return reject(e);
    }
    const data = JSON.stringify({
      model: MODEL,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      max_tokens: maxTokens,
      temperature,
    });
    const r = https.request({
      hostname: 'openrouter.ai', path: '/api/v1/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Rental Marketplace',
      },
    }, (resp) => {
      let body = '';
      resp.on('data', c => body += c);
      resp.on('end', () => {
        try {
          const j = JSON.parse(body);
          if (j.error) return reject(new Error(j.error.message || 'AI error'));
          resolve({ content: j.choices?.[0]?.message?.content || '', model: j.model });
        } catch (e) { reject(new Error('Bad AI response')); }
      });
    });
    r.on('error', reject);
    r.write(data); r.end();
  });
}

function parseJSON(t) {
  if (!t) return null;
  const c = String(t).replace(/```(?:json)?/gi, '').replace(/```/g, '');
  const m = c.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function err(res, e, label) {
  if (e.statusCode === 503) return res.status(503).json({ error: e.message });
  console.error(`${label} error:`, e.message);
  res.status(500).json({ error: e.message });
}

// 1. Predictive booking success (availability + pricing)
router.post('/booking-success', authenticateToken, async (req, res) => {
  try {
    const { listing, dates, guests, current_price_usd } = req.body || {};
    if (!listing) return res.status(400).json({ error: 'listing required' });
    const ai = await callLLM(
      'You score the booking success probability for a rental listing under given dates and price. JSON only.',
      `LISTING: ${JSON.stringify(listing)}\nDATES: ${JSON.stringify(dates || {})}\nGUESTS: ${guests || 2}\nPRICE_USD: ${current_price_usd || 'auto'}\nReturn JSON {"booking_probability":0,"recommended_price_usd":0,"key_drivers":[""],"competitor_signals":[""]}`
    );
    res.json({ type: 'booking-success', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'booking-success'); }
});

// 2. Host reliability prediction
router.post('/host-reliability', authenticateToken, async (req, res) => {
  try {
    const { host } = req.body || {};
    if (!host) return res.status(400).json({ error: 'host required' });
    const ai = await callLLM(
      'You predict host reliability for short-term rental hosts. JSON only.',
      `HOST: ${JSON.stringify(host)}\nReturn JSON {"reliability_score":0,"response_time_quality":"","cancellation_risk":"low|med|high","red_flags":[""],"badges_earned":[""]}`
    );
    res.json({ type: 'host-reliability', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'host-reliability'); }
});

// 3. Fraud detection in disputes
router.post('/dispute-fraud', authenticateToken, async (req, res) => {
  try {
    const { dispute, parties } = req.body || {};
    if (!dispute) return res.status(400).json({ error: 'dispute required' });
    const ai = await callLLM(
      'You score fraud likelihood in a rental dispute. JSON only.',
      `DISPUTE: ${JSON.stringify(dispute)}\nPARTIES: ${JSON.stringify(parties || {})}\nReturn JSON {"fraud_score":0,"prime_suspect":"none|guest|host","evidence_summary":"","recommended_action":"refund|partial|deny|escalate"}`
    );
    res.json({ type: 'dispute-fraud', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'dispute-fraud'); }
});

// 4. Dynamic pricing by demand/seasonality
router.post('/dynamic-pricing', authenticateToken, async (req, res) => {
  try {
    const { listing, calendar, market_demand } = req.body || {};
    if (!listing) return res.status(400).json({ error: 'listing required' });
    const ai = await callLLM(
      'You price a rental dynamically using demand + seasonality + competitor signals. JSON only.',
      `LISTING: ${JSON.stringify(listing)}\nCALENDAR: ${JSON.stringify(calendar || {})}\nMARKET: ${JSON.stringify(market_demand || {})}\nReturn JSON {"prices":[{"date":"","nightly_usd":0,"reason":""}],"avg_nightly_usd":0,"min_acceptable_usd":0}`
    );
    res.json({ type: 'dynamic-pricing', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'dynamic-pricing'); }
});

// 5. Property-management-system integration
// TODO: configure credentials for PMS_API_KEY (Hostaway / Guesty).
router.post('/pms-sync', authenticateToken, async (req, res) => {
  try {
    const { listing_id, target_pms = 'hostaway' } = req.body || {};
    if (!listing_id) return res.status(400).json({ error: 'listing_id required' });
    const ai = await callLLM(
      `You map a listing to a property-management system payload. PMS API: ${Boolean(process.env.PMS_API_KEY)}. JSON only.`,
      `PMS: ${target_pms}\nLISTING_ID: ${listing_id}\nReturn JSON {"target_object":"","mapped_fields":{},"missing_required":[""],"sync_status":"ready|blocked"}`
    );
    res.json({ type: 'pms-sync', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'pms-sync'); }
});

// 6. AI auto-reply to inquiries
router.post('/auto-reply', authenticateToken, async (req, res) => {
  try {
    const { inquiry, host_voice = 'warm' } = req.body || {};
    if (!inquiry) return res.status(400).json({ error: 'inquiry required' });
    const ai = await callLLM(
      'You draft a host reply to a rental inquiry. JSON only.',
      `INQUIRY: ${inquiry}\nVOICE: ${host_voice}\nReturn JSON {"draft_reply":"","tone":"","include_house_rules":false,"suggested_followups":[""]}`
    );
    res.json({ type: 'auto-reply', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'auto-reply'); }
});

// 7. Guest compatibility scoring
router.post('/guest-compatibility', authenticateToken, async (req, res) => {
  try {
    const { listing, guest_profile } = req.body || {};
    if (!listing || !guest_profile) return res.status(400).json({ error: 'listing and guest_profile required' });
    const ai = await callLLM(
      'You score guest-listing compatibility (rules, group composition). JSON only.',
      `LISTING: ${JSON.stringify(listing)}\nGUEST: ${JSON.stringify(guest_profile)}\nReturn JSON {"compatibility_score":0,"concerns":[""],"recommended_action":"accept|ask|decline","rules_to_emphasize":[""]}`
    );
    res.json({ type: 'guest-compatibility', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'guest-compatibility'); }
});

// 8. Insurance claim automation
// TODO: configure credentials for INSURANCE_API_KEY.
router.post('/insurance-claim', authenticateToken, async (req, res) => {
  try {
    const { incident, photos_captions } = req.body || {};
    if (!incident) return res.status(400).json({ error: 'incident required' });
    const ai = await callLLM(
      `You assemble an insurance claim packet. Insurance API set: ${Boolean(process.env.INSURANCE_API_KEY)}. JSON only.`,
      `INCIDENT: ${JSON.stringify(incident)}\nPHOTO_CAPTIONS: ${JSON.stringify(photos_captions || [])}\nReturn JSON {"narrative":"","line_items":[{"description":"","amount_usd":0}],"total_usd":0,"required_docs":[""],"submission_ready":false}`
    );
    res.json({ type: 'insurance-claim', result: parseJSON(ai.content) || { raw: ai.content }, model: ai.model });
  } catch (e) { err(res, e, 'insurance-claim'); }
});

module.exports = router;
