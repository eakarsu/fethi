const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const {
  assertEffectiveDate,
  canPurge,
  hasRole,
  latestRetentionDate,
  normalizeSignatureEvent,
  redact,
  sha256,
  stableJson,
  verifyWebhookSignature,
} = require('../lib/documentPolicy');

test('matter roles are ordered by privilege', () => {
  assert.equal(hasRole('viewer', 'viewer'), true);
  assert.equal(hasRole('editor', 'viewer'), true);
  assert.equal(hasRole('viewer', 'editor'), false);
  assert.equal(hasRole('counsel', 'editor'), true);
  assert.equal(hasRole('owner', 'counsel'), true);
});

test('unknown matter roles never authorize access', () => {
  assert.equal(hasRole('admin', 'viewer'), false);
  assert.equal(hasRole(undefined, 'viewer'), false);
});

test('stable JSON is independent of object key insertion order', () => {
  assert.equal(stableJson({ b: 2, a: { d: 4, c: 3 } }), stableJson({ a: { c: 3, d: 4 }, b: 2 }));
});

test('SHA-256 provenance is deterministic', () => {
  assert.equal(sha256('contract'), sha256('contract'));
  assert.notEqual(sha256('contract'), sha256('contract '));
  assert.equal(sha256('contract').length, 64);
});

test('redaction replaces every exact occurrence', () => {
  const output = redact('Ada paid Ada $200', ['Ada', '$200']);
  assert.equal(output.includes('Ada'), false);
  assert.equal(output.includes('$200'), false);
  assert.match(output, /███ paid ███/);
});

test('redaction requires an explicit term list', () => {
  assert.throws(() => redact('private', []), /At least one redaction term/);
});

test('effective date inside the authoritative range is accepted', () => {
  assert.doesNotThrow(() => assertEffectiveDate('2026-07-01', '2026-01-01', '2026-12-31'));
});

test('effective date before the authoritative range is rejected', () => {
  assert.throws(() => assertEffectiveDate('2025-12-31', '2026-01-01', null), /not authoritative/);
});

test('effective date after the authoritative range is rejected', () => {
  assert.throws(() => assertEffectiveDate('2027-01-01', '2026-01-01', '2026-12-31'), /not authoritative/);
});

test('legal hold always blocks purge', () => {
  assert.equal(canPurge({ legalHold: true, retentionUntil: '2020-01-01', now: new Date('2026-01-01') }), false);
});

test('purge is blocked until a defined retention date expires', () => {
  assert.equal(canPurge({ legalHold: false, retentionUntil: null, now: new Date('2026-01-01') }), false);
  assert.equal(canPurge({ legalHold: false, retentionUntil: '2026-12-31', now: new Date('2026-01-01') }), false);
});

test('purge is allowed after retention expires without a hold', () => {
  assert.equal(canPurge({ legalHold: false, retentionUntil: '2025-12-31', now: new Date('2026-01-01') }), true);
});

test('the longest applicable retention period wins', () => {
  assert.equal(latestRetentionDate('2025-01-01', '2030-01-01', null), '2030-01-01');
});

test('valid webhook HMAC is accepted', () => {
  const body = Buffer.from('{"status":"signed"}');
  const signature = crypto.createHmac('sha256', 'webhook-secret').update(body).digest('hex');
  assert.equal(verifyWebhookSignature(body, `sha256=${signature}`, 'webhook-secret'), true);
});

test('altered webhook content is rejected', () => {
  const signature = crypto.createHmac('sha256', 'webhook-secret').update('original').digest('hex');
  assert.equal(verifyWebhookSignature(Buffer.from('altered'), signature, 'webhook-secret'), false);
});

test('signature events reject unknown provider states', () => {
  assert.equal(normalizeSignatureEvent('signed'), 'signed');
  assert.throws(() => normalizeSignatureEvent('maybe'), /Unsupported signature event/);
});
