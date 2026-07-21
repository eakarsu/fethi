const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-that-is-more-than-thirty-two-characters';
process.env.CORS_ORIGINS = 'http://localhost:3000';

const app = require('../server');
const pool = require('../db');

async function request(base, path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test('governed workflow enforces review, provenance, revocation, export, retention, and immutable audit', async (t) => {
  if (!process.env.DATABASE_URL) {
    await pool.end();
    return t.skip('Set DATABASE_URL and run npm run migrate for integration coverage');
  }
  const migration = await pool.query(`SELECT to_regclass('public.governed_documents') AS table_name`);
  if (!migration.rows[0].table_name) {
    await pool.end();
    return t.skip('Run npm run migrate against DATABASE_URL before integration tests');
  }

  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  const suffix = crypto.randomUUID();

  async function register(label) {
    const response = await request(base, '/api/auth/register', {
      method: 'POST',
      body: { email: `${label}-${suffix}@example.test`, password: 'correct-horse-battery', name: label },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    return response.body;
  }

  const owner = await register('owner');
  const counsel = await register('counsel');
  const viewer = await register('viewer');

  const matter = await request(base, '/api/documents/matters', {
    method: 'POST', token: owner.token,
    body: { name: `Claim ${suffix}`, jurisdiction: 'NY-US', retentionUntil: '2020-01-01' },
  });
  assert.equal(matter.status, 201);

  for (const [user, role] of [[counsel, 'counsel'], [viewer, 'viewer']]) {
    const grant = await request(base, `/api/documents/matters/${matter.body.id}/members/${user.user.id}`, {
      method: 'PUT', token: owner.token, body: { role },
    });
    assert.equal(grant.status, 200);
  }

  const privileged = await request(base, `/api/documents/matters/${matter.body.id}/documents`, {
    method: 'POST', token: owner.token,
    body: { title: 'Privileged claim notes', kind: 'claim', content: 'Private advice', privileged: true },
  });
  assert.equal(privileged.status, 201);
  const viewerRead = await request(base, `/api/documents/documents/${privileged.body.id}`, { token: viewer.token });
  assert.equal(viewerRead.status, 403);

  const generated = await request(base, `/api/documents/matters/${matter.body.id}/documents`, {
    method: 'POST', token: owner.token,
    body: {
      title: 'Generated settlement draft', kind: 'dispute', content: 'Ada receives $200.',
      sourceType: 'generated', modelName: 'configured-model', promptVersion: 'settlement-v1',
    },
  });
  assert.equal(generated.status, 201);
  assert.equal(generated.body.status, 'draft');
  assert.equal(generated.body.version.content_sha256.length, 64);

  const conflict = await request(base, `/api/documents/documents/${generated.body.id}/versions`, {
    method: 'POST', token: owner.token,
    body: { content: 'stale edit', sourceType: 'manual', expectedCurrentVersion: 0 },
  });
  assert.equal(conflict.status, 409);

  const redacted = await request(base, `/api/documents/documents/${generated.body.id}/redactions`, {
    method: 'POST', token: owner.token, body: { terms: ['Ada', '$200'] },
  });
  assert.equal(redacted.status, 201);
  assert.equal(redacted.body.version, 2);

  const review = await request(base, `/api/documents/documents/${generated.body.id}/reviews`, {
    method: 'POST', token: counsel.token,
    body: {
      version: 2, jurisdiction: 'NY-US', effectiveDate: '2026-07-19',
      decision: 'approved', notes: 'Validated against the current settlement policy.',
    },
  });
  assert.equal(review.status, 201, JSON.stringify(review.body));

  const failedEnvelopeId = `failed-${suffix}`;
  await pool.query(
    `INSERT INTO signature_envelopes
      (document_id,version,provider,provider_envelope_id,status,signer_email,created_by)
     VALUES ($1,2,'test',$2,'sent','signer@example.test',$3)`,
    [generated.body.id, failedEnvelopeId, owner.user.id]
  );
  const webhookBody = JSON.stringify({ envelopeId: failedEnvelopeId, status: 'failed', error: 'Signer identity rejected' });
  const webhookSignature = crypto.createHmac('sha256', 'integration-webhook-secret').update(webhookBody).digest('hex');
  process.env.ESIGN_WEBHOOK_SECRET = 'integration-webhook-secret';
  const webhook = await fetch(`${base}/api/webhooks/esign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-webhook-signature': `sha256=${webhookSignature}` },
    body: webhookBody,
  });
  assert.equal(webhook.status, 204);
  const failedEnvelope = await pool.query(`SELECT status,last_error FROM signature_envelopes WHERE provider_envelope_id=$1`, [failedEnvelopeId]);
  assert.deepEqual(failedEnvelope.rows[0], { status: 'failed', last_error: 'Signer identity rejected' });

  const signature = await request(base, `/api/documents/documents/${generated.body.id}/signatures`, {
    method: 'POST', token: owner.token,
    body: { signerEmail: 'signer@example.test', callbackUrl: 'https://example.test/webhook' },
  });
  assert.equal(signature.status, 503);
  assert.match(signature.body.error, /provider is not configured/);

  const archive = await request(base, `/api/documents/documents/${generated.body.id}/archive`, {
    method: 'POST', token: owner.token,
  });
  assert.equal(archive.status, 503);
  assert.match(archive.body.error, /provider is not configured/);

  const exported = await request(base, `/api/documents/documents/${generated.body.id}/export`, {
    method: 'POST', token: viewer.token,
  });
  assert.equal(exported.status, 200);
  assert.equal(exported.body.exportSha256.length, 64);

  const hold = await request(base, `/api/documents/documents/${generated.body.id}/retention`, {
    method: 'PUT', token: owner.token, body: { retentionUntil: '2020-01-01', legalHold: true },
  });
  assert.equal(hold.status, 200);
  const blockedDelete = await request(base, `/api/documents/documents/${generated.body.id}`, {
    method: 'DELETE', token: owner.token,
  });
  assert.equal(blockedDelete.status, 409);

  const release = await request(base, `/api/documents/documents/${generated.body.id}/retention`, {
    method: 'PUT', token: owner.token, body: { legalHold: false },
  });
  assert.equal(release.status, 200);

  const revoke = await request(base, `/api/documents/matters/${matter.body.id}/members/${viewer.user.id}`, {
    method: 'DELETE', token: owner.token,
  });
  assert.equal(revoke.status, 204);
  const revokedRead = await request(base, `/api/documents/documents/${generated.body.id}`, { token: viewer.token });
  assert.equal(revokedRead.status, 403);

  const retainedDelete = await request(base, `/api/documents/documents/${generated.body.id}`, {
    method: 'DELETE', token: owner.token,
  });
  assert.equal(retainedDelete.status, 204);

  const audit = await request(base, `/api/documents/matters/${matter.body.id}/audit`, { token: counsel.token });
  assert.equal(audit.status, 200);
  assert.equal(audit.body.chainValid, true);
  assert.ok(audit.body.events.length >= 8);

  await assert.rejects(
    pool.query(`UPDATE audit_events SET action='tampered' WHERE id=$1`, [audit.body.events[0].id]),
    /immutable/
  );
});
