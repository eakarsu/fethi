// // === Batch 09 Gaps & Frontend Mounts ===
// Auto-generated gap-nonai endpoints for fethi.
// Calls OpenRouter via native fetch (no SDK); lazily creates gap_features table.
const express = require('express');
const router = express.Router();

const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function runAI(system, user) {
  if (!process.env.OPENROUTER_API_KEY) {
    const e = new Error('OPENROUTER_API_KEY missing'); e.statusCode = 503; throw e;
  }
  const r = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
    body: JSON.stringify({ model: OPENROUTER_MODEL, messages: [
      { role: 'system', content: system }, { role: 'user', content: user }
    ], max_tokens: 1500, temperature: 0.4 })
  });
  if (!r.ok) { const e = new Error(`AI ${r.status}`); e.statusCode = 502; throw e; }
  const data = await r.json();
  const content = data?.choices?.[0]?.message?.content || '';
  let parsed = null;
  try { const m = content.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); } catch {}
  return { raw: content, parsed, model: data?.model };
}

let _persistInit = false;
async function persist(feature, input, output) {
  // Lazy gap_features table — best-effort, swallow errors so AI still works.
  try {
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    if (!_persistInit) {
      await p.$executeRawUnsafe('CREATE TABLE IF NOT EXISTS gap_features (id SERIAL PRIMARY KEY, feature TEXT, input JSONB, output JSONB, created_at TIMESTAMPTZ DEFAULT NOW())');
      _persistInit = true;
    }
    await p.$executeRawUnsafe('INSERT INTO gap_features(feature, input, output) VALUES ($1, $2::jsonb, $3::jsonb)', feature, JSON.stringify(input || {}), JSON.stringify(output || {}));
  } catch { /* swallow */ }
}

// POST /api/gap-nonai-fethi/payment-processing-escrow-payouts
// Payment processing (escrow, payouts)
router.post('/payment-processing-escrow-payouts', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Payment processing (escrow, payouts)\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('payment-processing-escrow-payouts', req.body, ai);
    res.json({ feature: 'payment-processing-escrow-payouts', title: 'Payment processing (escrow, payouts)', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-fethi/dispute-resolution-workflow
// Dispute resolution workflow
router.post('/dispute-resolution-workflow', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Dispute resolution workflow\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('dispute-resolution-workflow', req.body, ai);
    res.json({ feature: 'dispute-resolution-workflow', title: 'Dispute resolution workflow', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-fethi/host-insurance-damage-protection
// Host insurance / damage protection
router.post('/host-insurance-damage-protection', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Host insurance / damage protection\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('host-insurance-damage-protection', req.body, ai);
    res.json({ feature: 'host-insurance-damage-protection', title: 'Host insurance / damage protection', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-fethi/calendar-sync-with-external-systems
// Calendar sync with external systems
router.post('/calendar-sync-with-external-systems', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Calendar sync with external systems\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('calendar-sync-with-external-systems', req.body, ai);
    res.json({ feature: 'calendar-sync-with-external-systems', title: 'Calendar sync with external systems', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-fethi/multi-language-support
// Multi-language support
router.post('/multi-language-support', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Multi-language support\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('multi-language-support', req.body, ai);
    res.json({ feature: 'multi-language-support', title: 'Multi-language support', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-fethi/id-verification-module
// ID verification module
router.post('/id-verification-module', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: ID verification module\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('id-verification-module', req.body, ai);
    res.json({ feature: 'id-verification-module', title: 'ID verification module', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

// POST /api/gap-nonai-fethi/tax-document-generation-for-hosts
// Tax document generation for hosts
router.post('/tax-document-generation-for-hosts', async (req, res) => {
  try {
    const ai = await runAI('You are an expert assistant. Reply concisely in JSON.',
      `Feature: Tax document generation for hosts\nContext: ${JSON.stringify(req.body || {})}\nReturn JSON {"summary":"","key_points":[""],"recommendations":[""]}`);
    await persist('tax-document-generation-for-hosts', req.body, ai);
    res.json({ feature: 'tax-document-generation-for-hosts', title: 'Tax document generation for hosts', result: ai });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'error' });
  }
});

module.exports = router;
