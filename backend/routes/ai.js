const express = require('express');
const https = require('https');
const { authenticateToken } = require('../middleware/auth');
require('dotenv').config({ path: '../.env' });
const router = express.Router();

function callOpenRouter(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 2000,
    });
    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Rental Marketplace',
      },
    };
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error('Failed to parse response')); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// AI: Generate listing description
router.post('/generate-description', authenticateToken, async (req, res) => {
  try {
    const { title, category, features, location } = req.body;
    const prompt = `You are a rental marketplace copywriter. Write a compelling listing description.

Title: ${title}
Category: ${category}
Features: ${features || 'Not specified'}
Location: ${location || 'Not specified'}

Write a professional, enticing 2-3 paragraph description that highlights the value and appeals to renters. Include practical details. Be specific and engaging.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Suggest pricing
router.post('/suggest-price', authenticateToken, async (req, res) => {
  try {
    const { title, category, item_condition, location, city } = req.body;
    const prompt = `You are a rental pricing expert. Suggest optimal pricing for this rental item.

Item: ${title}
Category: ${category}
Condition: ${item_condition || 'Good'}
Location: ${location || 'Not specified'}, ${city || ''}

Provide structured pricing suggestions:
1. **Daily Rate**: Suggested price per day with reasoning
2. **Weekly Rate**: Suggested weekly rate (typically 15-20% discount)
3. **Monthly Rate**: Suggested monthly rate (typically 30-40% discount)
4. **Market Analysis**: Brief analysis of demand for this type of rental
5. **Pricing Tips**: 3 tips to maximize rental income

Use realistic USD pricing. Be specific with numbers.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Analyze listing
router.post('/analyze-listing', authenticateToken, async (req, res) => {
  try {
    const { item } = req.body;
    const prompt = `You are a rental marketplace consultant. Analyze this listing and provide improvement suggestions.

Title: ${item.title}
Category: ${item.category}
Price/Day: $${item.price_per_day}
Location: ${item.location}, ${item.city}
Condition: ${item.item_condition}
Description: ${item.description}
Features: ${item.features || 'Not listed'}

Provide a structured analysis:
1. **Listing Score**: Rate this listing 1-10 and explain
2. **Title Optimization**: How to improve the title for better visibility
3. **Pricing Assessment**: Is the price competitive? Suggestions?
4. **Description Review**: What's missing or could be improved
5. **Photography Tips**: Suggestions for images that would attract renters
6. **Competitive Edge**: How to stand out from similar listings

Be practical and actionable.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Market insights
router.post('/market-insights', authenticateToken, async (req, res) => {
  try {
    const { category, city } = req.body;
    const prompt = `You are a rental market analyst. Provide market insights for:

Category: ${category || 'General'}
Location: ${city || 'General market'}

Provide structured market intelligence:
1. **Market Overview**: Current state of the ${category || 'rental'} market
2. **Demand Trends**: What renters are looking for
3. **Pricing Benchmarks**: Typical price ranges for this category
4. **Seasonal Patterns**: When demand peaks and dips
5. **Top Tips for Owners**: How to maximize occupancy and revenue
6. **Emerging Opportunities**: New niches or underserved segments

Be data-driven and practical.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Product review
router.post('/review-product', authenticateToken, async (req, res) => {
  try {
    const { item } = req.body;
    const prompt = `You are an expert product reviewer for a rental marketplace. Write a comprehensive review for this rental listing as if you've thoroughly evaluated it.

Item: ${item.title}
Category: ${item.category}
Price/Day: $${item.price_per_day}
${item.price_per_week ? `Price/Week: $${item.price_per_week}` : ''}
${item.price_per_month ? `Price/Month: $${item.price_per_month}` : ''}
Location: ${item.location}, ${item.city}
Condition: ${item.item_condition}
Description: ${item.description}
Features: ${item.features || 'Not listed'}
Rules: ${item.rules || 'Not specified'}
Rating: ${item.rating || 'No ratings yet'} (${item.review_count || 0} reviews)

Write a detailed, structured review with:
1. **Overall Rating**: Give a score out of 5 stars with a one-line verdict
2. **Pros**: 4-5 specific advantages of renting this item
3. **Cons**: 2-3 potential drawbacks or considerations
4. **Value for Money**: Is the pricing fair? Compare to typical market rates
5. **Best For**: Who would benefit most from renting this?
6. **Tips for Renters**: 3 practical tips for getting the most out of this rental
7. **Final Verdict**: 2-3 sentence summary recommendation

Be honest, balanced, and helpful. Use specific details from the listing.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Compare listings
router.post('/compare-listings', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    const itemDescriptions = items.map((item, i) => `
**Option ${i + 1}: ${item.title}**
- Category: ${item.category}
- Price/Day: $${item.price_per_day}
- Location: ${item.location}, ${item.city}
- Condition: ${item.item_condition}
- Rating: ${item.rating || 'N/A'} (${item.review_count || 0} reviews)
- Features: ${item.features || 'Not listed'}
`).join('\n');

    const prompt = `You are a rental marketplace comparison expert. Compare these rental listings and help the user decide which is best.

${itemDescriptions}

Provide a structured comparison:
1. **Quick Comparison Table**: Compare key metrics (price, condition, location, rating)
2. **Best Value**: Which offers the best value for money and why?
3. **Best Quality**: Which has superior quality/features?
4. **Best Location**: Which has the most convenient location?
5. **Winner Overall**: Your top recommendation with reasoning
6. **When to Choose Each**: Scenarios where each option would be the better choice

Be specific, fair, and data-driven in your comparison.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Rental tips for specific product
router.post('/rental-tips', authenticateToken, async (req, res) => {
  try {
    const { item } = req.body;
    const prompt = `You are a rental expert advisor. Provide detailed rental tips for someone considering renting this item.

Item: ${item.title}
Category: ${item.category}
Price/Day: $${item.price_per_day}
Condition: ${item.item_condition}
Description: ${item.description}
Features: ${item.features || 'Not listed'}
Rules: ${item.rules || 'Not specified'}

Provide practical, actionable advice:
1. **Before You Rent**: 5 things to check/verify before committing
2. **During Rental**: Best practices for using and maintaining the item
3. **Hidden Costs to Watch**: Fees, deposits, or expenses renters often overlook
4. **Negotiation Tips**: How to potentially get a better deal
5. **Insurance & Protection**: What coverage to consider
6. **Return Checklist**: Steps to ensure a smooth return and full deposit back
7. **Red Flags**: Warning signs that a rental listing might be problematic

Be specific to this type of ${item.category} rental. Give real, practical advice.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: Smart recommendation
router.post('/smart-recommend', authenticateToken, async (req, res) => {
  try {
    const { item, userNeeds } = req.body;
    const prompt = `You are a rental marketplace recommendation AI. Based on what the user is looking at, provide smart recommendations and alternatives.

Currently Viewing: ${item.title}
Category: ${item.category}
Price/Day: $${item.price_per_day}
Location: ${item.city}
${userNeeds ? `User's Specific Needs: ${userNeeds}` : ''}

Provide:
1. **Is This Right for You?**: Quick assessment of who this rental is ideal for
2. **What to Look for Instead**: If this isn't perfect, describe what alternatives to search for
3. **Budget Alternatives**: Describe cheaper options in this category that might work
4. **Premium Upgrades**: Higher-end alternatives worth considering for a better experience
5. **Complementary Rentals**: Other items the user might need alongside this (e.g., renting a tent? You might also need sleeping bags)
6. **Timing Advice**: Best time to rent this type of item for better prices or availability
7. **Similar Categories**: Related categories the user might want to explore

Be practical and specific to the ${item.category} category.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// AI: General question
router.post('/ask', authenticateToken, async (req, res) => {
  try {
    const { question } = req.body;
    const prompt = `You are a helpful rental marketplace assistant. Answer this question about renting, listing items, pricing, or marketplace best practices.

Question: ${question}

Provide a clear, structured, and helpful response. Use sections with bold headers. Be practical and specific.`;
    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Audit-driven addition: "Predictive booking success (availability optimization, pricing)".
router.post('/predict-booking-success', authenticateToken, async (req, res) => {
  try {
    const { listing, recentInquiries, market, period } = req.body;
    if (!listing) {
      return res.status(400).json({ error: 'listing is required' });
    }

    const prompt = `You are a rental-marketplace booking analyst. Predict the probability that this listing achieves at least one paid booking in the requested period.

Listing:
${JSON.stringify(listing, null, 2)}

Recent inquiries (sample):
${JSON.stringify(recentInquiries || [], null, 2)}

Market context: ${market || 'unspecified'}
Period: ${period || 'next 30 days'}

Respond with strict JSON only:
{"booking_probability": <0-1 number>, "expected_bookings": <integer>, "drivers": [<strings>], "risks": [<strings>], "recommended_pricing_change_pct": <number>, "recommended_actions": [<strings>]}`;

    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit-driven addition: "Host reliability prediction".
router.post('/host-reliability', authenticateToken, async (req, res) => {
  try {
    const { host, recentBookings, reviews, disputes } = req.body;
    if (!host) {
      return res.status(400).json({ error: 'host is required' });
    }

    const prompt = `You are a rental-marketplace trust analyst. Predict a host's 90-day reliability trajectory.

Host:
${JSON.stringify(host, null, 2)}

Recent bookings:
${JSON.stringify(recentBookings || [], null, 2)}

Reviews (sample):
${JSON.stringify((reviews || []).slice(0, 50), null, 2)}

Disputes:
${JSON.stringify(disputes || [], null, 2)}

Respond with strict JSON only:
{"reliability_score_now": <0-100>, "predicted_score_in_90d": <0-100>, "trend": "improving|stable|declining", "risk_signals": [<strings>], "growth_signals": [<strings>], "recommended_interventions": [<strings>]}`;

    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Audit-driven addition: "Auto-respond to inquiries with AI".
router.post('/auto-respond', authenticateToken, async (req, res) => {
  try {
    const { listing, inquiry, hostStyle } = req.body;
    if (!inquiry || !inquiry.message) {
      return res.status(400).json({ error: 'inquiry.message is required' });
    }

    const prompt = `You are drafting a host's reply to a renter inquiry. Be friendly, specific, and propose a concrete next step.

Listing:
${JSON.stringify(listing || {}, null, 2)}

Inquiry from renter:
"${inquiry.message}"

Host preferred style/tone (optional): ${hostStyle || 'professional, warm, concise'}

Respond with strict JSON only:
{"reply_text": <string>, "suggested_actions": [<strings>], "confidence": "low|medium|high", "needs_human_review": <boolean>, "reason_for_review": <string-or-null>}`;

    const result = await callOpenRouter(prompt);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
