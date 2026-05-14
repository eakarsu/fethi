# Audit Apply Notes — fethi

Source: `_AUDIT/reports/batch_09.md` § fethi

## Original audit recommendations

### Existing AI endpoints
`/generate-description`, `/suggest-price`, `/analyze-listing`, `/market-insights`, `/review-product`, `/compare-listings`, `/rental-tips`, `/smart-recommend`, `/ask`.

### Missing non-AI features
- Payment processing
- Dispute resolution
- Host insurance

### Custom feature ideas
- Predictive booking success (availability optimization, pricing)
- Host reliability prediction
- Fraud detection in rental disputes
- Dynamic pricing based on demand/seasonality
- Integration with property management systems
- Auto-respond to inquiries with AI
- Guest matching (compatibility scoring)
- Insurance claim automation

## Implemented this pass

All implemented in `backend/routes/ai.js`, mounted under `/api/ai`:

- `POST /api/ai/predict-booking-success` — accepts `{ listing, recentInquiries?, market?, period? }`, returns JSON booking_probability, expected_bookings, drivers, risks, recommended_pricing_change_pct, recommended_actions. Mechanical implementation of "Predictive booking success".
- `POST /api/ai/host-reliability` — accepts `{ host, recentBookings?, reviews?, disputes? }`, returns JSON reliability_score_now, predicted_score_in_90d, trend, risk/growth signals, recommended interventions. Mechanical implementation of "Host reliability prediction".
- `POST /api/ai/auto-respond` — accepts `{ listing?, inquiry, hostStyle? }`, returns JSON reply_text, suggested_actions, confidence, needs_human_review flag. Mechanical implementation of "Auto-respond to inquiries with AI".

All three reuse the existing `callOpenRouter` helper and `authenticateToken` middleware from this file. Syntax-checked with `node --check`.

## Backlog (not implemented)

### Needs schema/data model work
- Payment processing — needs Stripe (or equivalent) wiring; "no new external SDK deps" rules out this pass.
- Dispute resolution — state machine, evidence storage, outcome tracking.
- Host insurance — policy linking, claim filing.

### Needs product decision
- Fraud detection in rental disputes — needs taxonomy of fraud signals.
- Dynamic pricing — surge bounds and pricing policy.
- Guest matching (compatibility scoring) — privacy / fairness review needed.
- Insurance claim automation — overlaps host-insurance schema decisions.

### Needs creds / external deps
- Property management system integration (Hostaway, Guesty, etc.).

## Categorisation

- MECHANICAL: predict-booking-success, host-reliability, auto-respond (all done).
- NEEDS-SCHEMA: payments, disputes, insurance.
- NEEDS-PRODUCT-DECISION: fraud taxonomy, dynamic pricing policy, guest matching, claim automation.
- NEEDS-CREDS: PMS integrations.

## Apply pass 4 (mechanical backlog)

- **Action:** LEFT-AS-IS (no MECHANICAL items remain)
- **Features added:** none
- **Backlog deferred:** Payment processing (NEEDS-CREDS — Stripe SDK), dispute resolution (NEEDS-SCHEMA — state machine, evidence storage, outcome tracking), host insurance (NEEDS-SCHEMA — policy linking, claim filing), fraud detection in rental disputes (NEEDS-PRODUCT-DECISION — fraud taxonomy), dynamic pricing policy (NEEDS-PRODUCT-DECISION — surge bounds), guest matching / compatibility scoring (NEEDS-PRODUCT-DECISION — privacy / fairness review), insurance claim automation (NEEDS-PRODUCT-DECISION — overlaps insurance schema), PMS integrations Hostaway/Guesty (NEEDS-CREDS).
- **Smoke test:** N/A (no code change)
- **Notes:** Pass-2 already added the three mechanical AI items (`/predict-booking-success`, `/host-reliability`, `/auto-respond`). Remaining backlog requires schema changes, product decisions, or external creds — outside mechanical scope.

## Apply pass 3 (frontend)

- Action: **LEFT-AS-IS**.
- FE wires every backend AI endpoint with JWT Bearer auth from `localStorage` (via `useAuth().apiFetch` which attaches `Authorization: Bearer ${token}`):
  - `pages/AIInsights.jsx` — pass-2 additions `/predict-booking-success`, `/host-reliability`, `/auto-respond`.
  - `pages/AIAssistant.jsx` — `/ask`, `/market-insights`.
  - `pages/MyListings.jsx` — `/suggest-price`, `/generate-description`.
  - `pages/Browse.jsx` — `/review-product`, `/analyze-listing`, `/rental-tips`, `/smart-recommend`, `/compare-listings`.
  - `pages/Dashboard.jsx` — `/ask`.
- Routes `/ai`, `/ai-insights` registered in `App.jsx` behind `Protected`.
- 503-no-key handling: server returns 503; FE shows error toast via existing handler.
- Idempotent — no FE files touched.
