const crypto = require('node:crypto');
const router = require('express').Router();
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');

router.post('/rental-readiness', authenticateToken, async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || '').trim();
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });
    const apiKey = process.env.OPENROUTER_API_KEY;
    const model = process.env.OPENROUTER_MODEL;
    const baseUrl = process.env.OPENROUTER_BASE_URL;
    if (!apiKey || !model || !baseUrl) return res.status(503).json({ error: 'OpenRouter runtime is not configured' });
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Review rental marketplace runtime readiness. Return concise risks, evidence gaps, next actions, uncertainty, and a required human review gate.' },
          { role: 'user', content: prompt },
        ],
      }),
    });
    if (!response.ok) throw Object.assign(new Error(`OpenRouter returned ${response.status}`), { statusCode: 502 });
    const payload = await response.json();
    const output = String(payload?.choices?.[0]?.message?.content || '').trim();
    if (!output) throw Object.assign(new Error('OpenRouter returned an empty response'), { statusCode: 502 });
    const id = crypto.randomUUID();
    await pool.query(
      `INSERT INTO runtime_ai_results(id,user_id,feature,input,output,model,provider_response_id)
       VALUES($1,$2,'rental-readiness',$3,$4,$5,$6)`,
      [id, req.user.id, { prompt }, output, model, payload.id || null]
    );
    return res.json({ id, response: output, model, provider: 'openrouter', providerResponseId: payload.id || null });
  } catch (error) {
    error.statusCode ||= 500;
    return next(error);
  }
});

module.exports = router;
