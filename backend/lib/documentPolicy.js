const crypto = require('crypto');

const ROLE_LEVEL = Object.freeze({ viewer: 1, editor: 2, counsel: 3, owner: 4 });
const SIGNATURE_EVENTS = new Set(['created', 'sent', 'delivered', 'signed', 'declined', 'failed', 'voided']);

function sha256(value) {
  return crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function hasRole(actual, required) {
  return Boolean(ROLE_LEVEL[actual] && ROLE_LEVEL[actual] >= ROLE_LEVEL[required]);
}

function assertEffectiveDate(effectiveDate, effectiveFrom, effectiveTo) {
  const target = new Date(`${effectiveDate}T00:00:00Z`);
  const from = new Date(`${effectiveFrom}T00:00:00Z`);
  const to = effectiveTo ? new Date(`${effectiveTo}T23:59:59Z`) : null;
  if ([target, from, to].filter(Boolean).some((date) => Number.isNaN(date.getTime()))) {
    throw Object.assign(new Error('Dates must use YYYY-MM-DD'), { statusCode: 400 });
  }
  if (target < from || (to && target > to)) {
    throw Object.assign(new Error('Template is not authoritative on the requested effective date'), { statusCode: 422 });
  }
}

function redact(content, terms) {
  if (!Array.isArray(terms) || terms.length === 0) {
    throw Object.assign(new Error('At least one redaction term is required'), { statusCode: 400 });
  }
  let output = String(content);
  for (const term of terms) {
    const normalized = String(term).trim();
    if (!normalized) continue;
    output = output.split(normalized).join('█'.repeat(Math.min(normalized.length, 24)));
  }
  return output;
}

function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const supplied = String(signature).replace(/^sha256=/, '');
  if (expected.length !== supplied.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

function normalizeSignatureEvent(status) {
  if (!SIGNATURE_EVENTS.has(status)) {
    throw Object.assign(new Error('Unsupported signature event'), { statusCode: 400 });
  }
  return status;
}

function canPurge({ legalHold, retentionUntil, now = new Date() }) {
  if (legalHold) return false;
  if (!retentionUntil) return false;
  return new Date(`${retentionUntil}T23:59:59Z`) < now;
}

function latestRetentionDate(...dates) {
  const normalized = dates.filter(Boolean).map((date) => {
    if (date instanceof Date) return date.toISOString().slice(0, 10);
    return String(date).slice(0, 10);
  }).sort();
  return normalized.at(-1) || null;
}

module.exports = {
  assertEffectiveDate,
  canPurge,
  hasRole,
  latestRetentionDate,
  normalizeSignatureEvent,
  redact,
  sha256,
  stableJson,
  verifyWebhookSignature,
};
