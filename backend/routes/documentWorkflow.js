const express = require('express');
const pool = require('../db');
const { authenticateToken } = require('../middleware/auth');
const {
  assertEffectiveDate,
  canPurge,
  hasRole,
  latestRetentionDate,
  normalizeSignatureEvent,
  redact,
  sha256,
  verifyWebhookSignature,
} = require('../lib/documentPolicy');
const { appendAudit, verifyAuditChain } = require('../services/audit');
const providers = require('../services/documentProviders');

const router = express.Router();
const webhookRouter = express.Router();
router.use(authenticateToken);

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

function sendError(res, error) {
  if ((error.code === '23505' || error.code === '23503') && !error.statusCode) {
    return res.status(409).json({ error: 'The requested change conflicts with current data' });
  }
  console.error('Document workflow error:', error.message);
  return res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Document workflow failed' });
}

async function transaction(work) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const value = await work(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function membership(client, matterId, userId, required = 'viewer') {
  const result = await client.query(
    `SELECT role FROM matter_members
     WHERE matter_id=$1 AND user_id=$2 AND revoked_at IS NULL`,
    [matterId, userId]
  );
  const role = result.rows[0]?.role;
  if (!hasRole(role, required)) throw httpError(403, 'Matter access denied');
  return role;
}

async function loadDocument(client, documentId, userId, required = 'viewer', lock = false) {
  const result = await client.query(
    `SELECT d.*, m.jurisdiction AS matter_jurisdiction, m.legal_hold AS matter_legal_hold,
            m.retention_until AS matter_retention_until
     FROM governed_documents d JOIN matters m ON m.id=d.matter_id
     WHERE d.id=$1 ${lock ? 'FOR UPDATE OF d' : ''}`,
    [documentId]
  );
  if (!result.rows[0]) throw httpError(404, 'Document not found');
  const role = await membership(client, result.rows[0].matter_id, userId, required);
  if (result.rows[0].privileged && !hasRole(role, 'counsel')) throw httpError(403, 'Privileged document access denied');
  return { document: result.rows[0], role };
}

async function addVersion(client, document, actorId, payload) {
  if (!payload.content || typeof payload.content !== 'string') throw httpError(400, 'content is required');
  const version = Number(document.current_version) + 1;
  const digest = sha256(payload.content);
  const result = await client.query(
    `INSERT INTO document_versions
       (document_id, version, content, content_sha256, source_type, source_uri, source_sha256,
        provider_request_id, model_name, prompt_version, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [document.id, version, payload.content, digest, payload.sourceType, payload.sourceUri || null,
      payload.sourceSha256 || null, payload.providerRequestId || null, payload.modelName || null,
      payload.promptVersion || null, actorId]
  );
  await client.query(
    `UPDATE governed_documents SET current_version=$1, status='draft', updated_at=NOW() WHERE id=$2`,
    [version, document.id]
  );
  await appendAudit(client, {
    matterId: document.matter_id,
    actorId,
    action: 'document.version.created',
    entityType: 'document',
    entityId: document.id,
    details: { version, contentSha256: digest, sourceType: payload.sourceType, sourceUri: payload.sourceUri || null },
  });
  return result.rows[0];
}

router.get('/matters', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, mm.role FROM matters m JOIN matter_members mm ON mm.matter_id=m.id
       WHERE mm.user_id=$1 AND mm.revoked_at IS NULL ORDER BY m.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) { sendError(res, error); }
});

router.post('/matters', async (req, res) => {
  try {
    const { name, jurisdiction, retentionUntil = null } = req.body || {};
    if (!name || !jurisdiction) throw httpError(400, 'name and jurisdiction are required');
    const matter = await transaction(async (client) => {
      const result = await client.query(
        `INSERT INTO matters(name,jurisdiction,created_by,retention_until) VALUES ($1,$2,$3,$4) RETURNING *`,
        [name.trim(), jurisdiction.trim().toUpperCase(), req.user.id, retentionUntil]
      );
      const created = result.rows[0];
      await client.query(
        `INSERT INTO matter_members(matter_id,user_id,role,granted_by) VALUES ($1,$2,'owner',$2)`,
        [created.id, req.user.id]
      );
      await appendAudit(client, { matterId: created.id, actorId: req.user.id, action: 'matter.created', entityType: 'matter', entityId: created.id });
      return created;
    });
    res.status(201).json(matter);
  } catch (error) { sendError(res, error); }
});

router.put('/matters/:matterId/members/:userId', async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!['viewer', 'editor', 'counsel'].includes(role)) throw httpError(400, 'role must be viewer, editor, or counsel');
    const member = await transaction(async (client) => {
      await membership(client, req.params.matterId, req.user.id, 'owner');
      const result = await client.query(
        `INSERT INTO matter_members(matter_id,user_id,role,granted_by)
         VALUES ($1,$2,$3,$4)
         ON CONFLICT (matter_id,user_id) DO UPDATE
           SET role=EXCLUDED.role, granted_by=EXCLUDED.granted_by, granted_at=NOW(), revoked_at=NULL
         RETURNING *`,
        [req.params.matterId, req.params.userId, role, req.user.id]
      );
      await appendAudit(client, {
        matterId: req.params.matterId, actorId: req.user.id, action: 'matter.access.granted',
        entityType: 'user', entityId: req.params.userId, details: { role },
      });
      return result.rows[0];
    });
    res.json(member);
  } catch (error) { sendError(res, error); }
});

router.delete('/matters/:matterId/members/:userId', async (req, res) => {
  try {
    await transaction(async (client) => {
      await membership(client, req.params.matterId, req.user.id, 'owner');
      if (String(req.params.userId) === String(req.user.id)) throw httpError(400, 'Matter owners cannot revoke themselves');
      const result = await client.query(
        `UPDATE matter_members SET revoked_at=NOW() WHERE matter_id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING role`,
        [req.params.matterId, req.params.userId]
      );
      if (!result.rows[0]) throw httpError(404, 'Active member not found');
      await appendAudit(client, {
        matterId: req.params.matterId, actorId: req.user.id, action: 'matter.access.revoked',
        entityType: 'user', entityId: req.params.userId, details: { priorRole: result.rows[0].role },
      });
    });
    res.status(204).end();
  } catch (error) { sendError(res, error); }
});

router.post('/templates/sync', async (req, res) => {
  try {
    if (!['reviewer', 'admin'].includes(req.user.platformRole)) throw httpError(403, 'Reviewer access required');
    const { externalId, jurisdiction, effectiveDate } = req.body || {};
    if (!externalId || !jurisdiction || !effectiveDate) throw httpError(400, 'externalId, jurisdiction, and effectiveDate are required');
    const source = await providers.fetchTemplate(externalId, jurisdiction, effectiveDate);
    const required = ['sourceName', 'externalId', 'title', 'content', 'sourceUrl', 'sourceVersion', 'effectiveFrom'];
    if (required.some((key) => !source[key])) throw httpError(502, 'Template provider returned an incomplete authoritative record');
    assertEffectiveDate(effectiveDate, source.effectiveFrom, source.effectiveTo);
    const result = await pool.query(
      `INSERT INTO authoritative_templates
        (source_name,external_id,jurisdiction,title,content,source_url,source_version,effective_from,effective_to,content_sha256)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (source_name,external_id,source_version) DO UPDATE SET fetched_at=NOW()
       RETURNING *`,
      [source.sourceName, source.externalId, jurisdiction.toUpperCase(), source.title, source.content,
        source.sourceUrl, source.sourceVersion, source.effectiveFrom, source.effectiveTo || null, sha256(source.content)]
    );
    res.json(result.rows[0]);
  } catch (error) { sendError(res, error); }
});

router.get('/matters/:matterId/documents', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const role = await membership(client, req.params.matterId, req.user.id);
      const result = await client.query(
        `SELECT id,matter_id,title,kind,status,current_version,privileged,template_id,retention_until,legal_hold,created_at,updated_at
         FROM governed_documents WHERE matter_id=$1 AND status <> 'deleted'
           AND (privileged=FALSE OR $2::boolean) ORDER BY updated_at DESC`,
        [req.params.matterId, hasRole(role, 'counsel')]
      );
      res.json(result.rows);
    } finally { client.release(); }
  } catch (error) { sendError(res, error); }
});

router.post('/matters/:matterId/documents', async (req, res) => {
  try {
    const {
      title, kind, content, sourceType = 'manual', sourceUri = null, sourceSha256 = null,
      privileged = false, templateId = null, modelName = null, promptVersion = null, retentionUntil = null,
    } = req.body || {};
    if (!title || !kind || !content) throw httpError(400, 'title, kind, and content are required');
    if (!['manual', 'upload', 'template', 'generated'].includes(sourceType)) throw httpError(400, 'Invalid initial sourceType');
    if (sourceType === 'generated' && (!modelName || !promptVersion)) throw httpError(400, 'Generated content requires modelName and promptVersion provenance');
    const document = await transaction(async (client) => {
      const role = await membership(client, req.params.matterId, req.user.id, 'editor');
      if (privileged && !hasRole(role, 'counsel')) throw httpError(403, 'Counsel access is required to mark privileged content');
      if (templateId) {
        const validTemplate = await client.query(
          `SELECT t.id FROM authoritative_templates t JOIN matters m ON m.id=$2
           WHERE t.id=$1 AND t.jurisdiction=m.jurisdiction
             AND t.effective_from<=CURRENT_DATE AND (t.effective_to IS NULL OR t.effective_to>=CURRENT_DATE)`,
          [templateId, req.params.matterId]
        );
        if (!validTemplate.rows[0]) throw httpError(422, 'Template is not authoritative for this matter and date');
      }
      const result = await client.query(
        `INSERT INTO governed_documents
          (matter_id,title,kind,privileged,template_id,created_by,retention_until)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.params.matterId, title.trim(), kind, Boolean(privileged), templateId, req.user.id, retentionUntil]
      );
      const created = result.rows[0];
      const version = await addVersion(client, created, req.user.id, {
        content, sourceType, sourceUri, sourceSha256, modelName, promptVersion,
      });
      await appendAudit(client, {
        matterId: req.params.matterId, actorId: req.user.id, action: 'document.created',
        entityType: 'document', entityId: created.id, details: { kind, privileged: Boolean(privileged) },
      });
      return { ...created, current_version: version.version, version };
    });
    res.status(201).json(document);
  } catch (error) { sendError(res, error); }
});

router.get('/documents/:documentId', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      const { document } = await loadDocument(client, req.params.documentId, req.user.id);
      const [versions, reviews, signatures, filings, archives] = await Promise.all([
        client.query(`SELECT id,version,content_sha256,source_type,source_uri,source_sha256,provider_request_id,model_name,prompt_version,created_by,created_at FROM document_versions WHERE document_id=$1 ORDER BY version DESC`, [document.id]),
        client.query(`SELECT * FROM document_reviews WHERE document_id=$1 ORDER BY created_at DESC`, [document.id]),
        client.query(`SELECT * FROM signature_envelopes WHERE document_id=$1 ORDER BY created_at DESC`, [document.id]),
        client.query(`SELECT * FROM filing_submissions WHERE document_id=$1 ORDER BY created_at DESC`, [document.id]),
        client.query(`SELECT * FROM document_archives WHERE document_id=$1 ORDER BY created_at DESC`, [document.id]),
      ]);
      res.json({ ...document, versions: versions.rows, reviews: reviews.rows, signatures: signatures.rows, filings: filings.rows, archives: archives.rows });
    } finally { client.release(); }
  } catch (error) { sendError(res, error); }
});

router.post('/documents/:documentId/versions', async (req, res) => {
  try {
    const { content, expectedCurrentVersion, sourceType = 'manual', sourceUri, sourceSha256, modelName, promptVersion } = req.body || {};
    if (!Number.isInteger(expectedCurrentVersion)) throw httpError(400, 'expectedCurrentVersion is required');
    const version = await transaction(async (client) => {
      const { document } = await loadDocument(client, req.params.documentId, req.user.id, 'editor', true);
      if (Number(document.current_version) !== expectedCurrentVersion) throw httpError(409, 'Document has a newer version');
      if (!['manual', 'upload', 'generated'].includes(sourceType)) throw httpError(400, 'Invalid version sourceType');
      if (sourceType === 'generated' && (!modelName || !promptVersion)) throw httpError(400, 'Generated content requires modelName and promptVersion provenance');
      return addVersion(client, document, req.user.id, { content, sourceType, sourceUri, sourceSha256, modelName, promptVersion });
    });
    res.status(201).json(version);
  } catch (error) { sendError(res, error); }
});

router.post('/documents/:documentId/redactions', async (req, res) => {
  try {
    const version = await transaction(async (client) => {
      const { document } = await loadDocument(client, req.params.documentId, req.user.id, 'editor', true);
      const current = await client.query(
        `SELECT * FROM document_versions WHERE document_id=$1 AND version=$2`,
        [document.id, document.current_version]
      );
      return addVersion(client, document, req.user.id, {
        content: redact(current.rows[0].content, req.body?.terms),
        sourceType: 'redacted', sourceUri: `document://${document.id}/versions/${document.current_version}`,
        sourceSha256: current.rows[0].content_sha256,
      });
    });
    res.status(201).json(version);
  } catch (error) { sendError(res, error); }
});

router.post('/documents/:documentId/ocr', async (req, res) => {
  try {
    const { sourceUri, sourceSha256 } = req.body || {};
    if (!sourceUri || !sourceSha256) throw httpError(400, 'sourceUri and sourceSha256 are required');
    const extracted = await providers.extractText({ sourceUri, sourceSha256 });
    if (!extracted.text || !extracted.requestId) throw httpError(502, 'OCR provider returned incomplete provenance');
    const version = await transaction(async (client) => {
      const { document } = await loadDocument(client, req.params.documentId, req.user.id, 'editor', true);
      return addVersion(client, document, req.user.id, {
        content: extracted.text, sourceType: 'ocr', sourceUri, sourceSha256, providerRequestId: extracted.requestId,
      });
    });
    res.status(201).json(version);
  } catch (error) { sendError(res, error); }
});

router.post('/documents/:documentId/reviews', async (req, res) => {
  try {
    const { version, jurisdiction, effectiveDate, decision, notes } = req.body || {};
    if (!Number.isInteger(version) || !jurisdiction || !effectiveDate || !['approved', 'changes_requested'].includes(decision) || !notes) {
      throw httpError(400, 'version, jurisdiction, effectiveDate, decision, and notes are required');
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) || Number.isNaN(new Date(`${effectiveDate}T00:00:00Z`).getTime())) {
      throw httpError(400, 'effectiveDate must use YYYY-MM-DD');
    }
    const review = await transaction(async (client) => {
      const { document } = await loadDocument(client, req.params.documentId, req.user.id, 'counsel', true);
      if (Number(document.current_version) !== version) throw httpError(409, 'Only the current document version can be reviewed');
      if (jurisdiction.toUpperCase() !== document.matter_jurisdiction.toUpperCase()) throw httpError(422, 'Review jurisdiction does not match the matter');
      if (new Date(`${effectiveDate}T00:00:00Z`) > new Date()) throw httpError(422, 'effectiveDate cannot be in the future');
      const result = await client.query(
        `INSERT INTO document_reviews(document_id,version,reviewer_id,jurisdiction,effective_date,decision,notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (document_id,version,reviewer_id) DO UPDATE
           SET jurisdiction=EXCLUDED.jurisdiction,effective_date=EXCLUDED.effective_date,
               decision=EXCLUDED.decision,notes=EXCLUDED.notes,created_at=NOW()
         RETURNING *`,
        [document.id, version, req.user.id, jurisdiction.toUpperCase(), effectiveDate, decision, notes]
      );
      await client.query(`UPDATE governed_documents SET status=$1,updated_at=NOW() WHERE id=$2`, [decision === 'approved' ? 'approved' : 'draft', document.id]);
      await appendAudit(client, {
        matterId: document.matter_id, actorId: req.user.id, action: `document.review.${decision}`,
        entityType: 'document', entityId: document.id, details: { version, jurisdiction: jurisdiction.toUpperCase(), effectiveDate },
      });
      return result.rows[0];
    });
    res.status(201).json(review);
  } catch (error) { sendError(res, error); }
});

router.post('/documents/:documentId/signatures', async (req, res) => {
  try {
    const { signerEmail, callbackUrl } = req.body || {};
    if (!signerEmail || !callbackUrl) throw httpError(400, 'signerEmail and callbackUrl are required');
    const client = await pool.connect();
    let document;
    let version;
    try {
      ({ document } = await loadDocument(client, req.params.documentId, req.user.id, 'editor'));
      if (document.status !== 'approved') throw httpError(409, 'Current version requires counsel approval before signature');
      version = await client.query(`SELECT content,content_sha256 FROM document_versions WHERE document_id=$1 AND version=$2`, [document.id, document.current_version]);
    } finally { client.release(); }
    const envelope = await providers.createEnvelope({
      documentId: String(document.id), version: document.current_version, content: version.rows[0].content,
      contentSha256: version.rows[0].content_sha256, signerEmail, callbackUrl,
    });
    if (!envelope.id || !envelope.status) throw httpError(502, 'Signature provider returned an incomplete envelope');
    const created = await transaction(async (tx) => {
      const locked = await loadDocument(tx, document.id, req.user.id, 'editor', true);
      if (Number(locked.document.current_version) !== Number(document.current_version) || locked.document.status !== 'approved') {
        throw httpError(409, 'Document changed while creating the signature envelope');
      }
      const result = await tx.query(
        `INSERT INTO signature_envelopes(document_id,version,provider,provider_envelope_id,status,signer_email,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [document.id, document.current_version, envelope.provider || 'configured', envelope.id, normalizeSignatureEvent(envelope.status), signerEmail, req.user.id]
      );
      await tx.query(`UPDATE governed_documents SET status=$1,updated_at=NOW() WHERE id=$2`, [envelope.status === 'signed' ? 'signed' : 'signature_pending', document.id]);
      await appendAudit(tx, { matterId: document.matter_id, actorId: req.user.id, action: 'signature.envelope.created', entityType: 'document', entityId: document.id, details: { envelopeId: envelope.id, version: document.current_version } });
      return result.rows[0];
    });
    res.status(201).json(created);
  } catch (error) { sendError(res, error); }
});

router.post('/documents/:documentId/filings', async (req, res) => {
  try {
    const { destination, metadata = {} } = req.body || {};
    if (!destination) throw httpError(400, 'destination is required');
    const client = await pool.connect();
    let document;
    let version;
    try {
      ({ document } = await loadDocument(client, req.params.documentId, req.user.id, 'counsel'));
      if (!['approved', 'signed'].includes(document.status)) throw httpError(409, 'Document must be approved or signed before filing');
      version = await client.query(`SELECT content,content_sha256 FROM document_versions WHERE document_id=$1 AND version=$2`, [document.id, document.current_version]);
    } finally { client.release(); }
    const submission = await providers.submitFiling({
      documentId: String(document.id), version: document.current_version, destination, metadata,
      content: version.rows[0].content, contentSha256: version.rows[0].content_sha256,
    });
    if (!submission.id || !submission.status) throw httpError(502, 'Filing provider returned an incomplete submission');
    if (!['submitted', 'accepted', 'rejected', 'failed'].includes(submission.status)) throw httpError(502, 'Filing provider returned an unsupported status');
    const created = await transaction(async (tx) => {
      const result = await tx.query(
        `INSERT INTO filing_submissions(document_id,version,provider,provider_submission_id,status,receipt_uri,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [document.id, document.current_version, submission.provider || 'configured', submission.id, submission.status, submission.receiptUri || null, req.user.id]
      );
      if (submission.status === 'accepted') await tx.query(`UPDATE governed_documents SET status='filed',updated_at=NOW() WHERE id=$1`, [document.id]);
      await appendAudit(tx, { matterId: document.matter_id, actorId: req.user.id, action: 'filing.submitted', entityType: 'document', entityId: document.id, details: { submissionId: submission.id, destination } });
      return result.rows[0];
    });
    res.status(201).json(created);
  } catch (error) { sendError(res, error); }
});

router.post('/documents/:documentId/archive', async (req, res) => {
  try {
    const client = await pool.connect();
    let document;
    let version;
    try {
      ({ document } = await loadDocument(client, req.params.documentId, req.user.id, 'editor'));
      version = await client.query(`SELECT content,content_sha256 FROM document_versions WHERE document_id=$1 AND version=$2`, [document.id, document.current_version]);
    } finally { client.release(); }
    const stored = await providers.storeObject({
      objectKey: `matters/${document.matter_id}/documents/${document.id}/versions/${document.current_version}.json`,
      contentType: 'application/json',
      content: JSON.stringify({
        documentId: String(document.id), version: document.current_version,
        content: version.rows[0].content, contentSha256: version.rows[0].content_sha256,
      }),
      retentionUntil: latestRetentionDate(document.retention_until, document.matter_retention_until),
      legalHold: document.legal_hold || document.matter_legal_hold,
    });
    if (!stored.id || !stored.uri) throw httpError(502, 'Storage provider returned incomplete object provenance');
    const archive = await transaction(async (tx) => {
      const locked = await loadDocument(tx, document.id, req.user.id, 'editor', true);
      if (Number(locked.document.current_version) !== Number(document.current_version)) throw httpError(409, 'Document changed while archiving');
      const result = await tx.query(
        `INSERT INTO document_archives(document_id,version,provider,provider_object_id,object_uri,content_sha256,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [document.id, document.current_version, stored.provider || 'configured', stored.id, stored.uri, version.rows[0].content_sha256, req.user.id]
      );
      await appendAudit(tx, { matterId: document.matter_id, actorId: req.user.id, action: 'document.archived', entityType: 'document', entityId: document.id, details: { version: document.current_version, objectUri: stored.uri, contentSha256: version.rows[0].content_sha256 } });
      return result.rows[0];
    });
    res.status(201).json(archive);
  } catch (error) { sendError(res, error); }
});

router.post('/documents/:documentId/export', async (req, res) => {
  try {
    const result = await transaction(async (client) => {
      const { document } = await loadDocument(client, req.params.documentId, req.user.id);
      const version = await client.query(`SELECT * FROM document_versions WHERE document_id=$1 AND version=$2`, [document.id, document.current_version]);
      const bundle = {
        exportedAt: new Date().toISOString(),
        document: { id: document.id, matterId: document.matter_id, title: document.title, kind: document.kind, status: document.status },
        version: version.rows[0],
      };
      bundle.exportSha256 = sha256(JSON.stringify(bundle));
      await appendAudit(client, { matterId: document.matter_id, actorId: req.user.id, action: 'document.exported', entityType: 'document', entityId: document.id, details: { version: document.current_version, exportSha256: bundle.exportSha256 } });
      return bundle;
    });
    res.json(result);
  } catch (error) { sendError(res, error); }
});

router.put('/documents/:documentId/retention', async (req, res) => {
  try {
    const { retentionUntil, legalHold } = req.body || {};
    const updated = await transaction(async (client) => {
      const { document } = await loadDocument(client, req.params.documentId, req.user.id, 'owner', true);
      const result = await client.query(
        `UPDATE governed_documents SET retention_until=COALESCE($1,retention_until), legal_hold=COALESCE($2,legal_hold),updated_at=NOW() WHERE id=$3 RETURNING *`,
        [retentionUntil || null, typeof legalHold === 'boolean' ? legalHold : null, document.id]
      );
      await appendAudit(client, { matterId: document.matter_id, actorId: req.user.id, action: 'document.retention.updated', entityType: 'document', entityId: document.id, details: { retentionUntil: retentionUntil || null, legalHold } });
      return result.rows[0];
    });
    res.json(updated);
  } catch (error) { sendError(res, error); }
});

router.delete('/documents/:documentId', async (req, res) => {
  try {
    await transaction(async (client) => {
      const { document } = await loadDocument(client, req.params.documentId, req.user.id, 'owner', true);
      if (!canPurge({
        legalHold: document.legal_hold || document.matter_legal_hold,
        retentionUntil: latestRetentionDate(document.retention_until, document.matter_retention_until),
      })) throw httpError(409, 'Document is under hold or its retention period has not expired');
      await client.query(`UPDATE governed_documents SET status='deleted',updated_at=NOW() WHERE id=$1`, [document.id]);
      await appendAudit(client, { matterId: document.matter_id, actorId: req.user.id, action: 'document.deleted', entityType: 'document', entityId: document.id });
    });
    res.status(204).end();
  } catch (error) { sendError(res, error); }
});

router.get('/matters/:matterId/audit', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await membership(client, req.params.matterId, req.user.id, 'counsel');
      const [events, valid] = await Promise.all([
        client.query(`SELECT * FROM audit_events WHERE matter_id=$1 ORDER BY id`, [req.params.matterId]),
        verifyAuditChain(client),
      ]);
      res.json({ chainValid: valid, events: events.rows });
    } finally { client.release(); }
  } catch (error) { sendError(res, error); }
});

webhookRouter.post('/esign', express.raw({ type: 'application/json', limit: '256kb' }), async (req, res) => {
  try {
    const raw = req.body;
    if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, req.get('x-webhook-signature'), process.env.ESIGN_WEBHOOK_SECRET)) {
      throw httpError(401, 'Invalid webhook signature');
    }
    const event = JSON.parse(raw.toString('utf8'));
    const status = normalizeSignatureEvent(event.status);
    await transaction(async (client) => {
      const result = await client.query(
        `UPDATE signature_envelopes SET status=$1,last_error=$2,updated_at=NOW()
         WHERE provider_envelope_id=$3 RETURNING *`,
        [status, event.error || null, event.envelopeId]
      );
      if (!result.rows[0]) throw httpError(404, 'Envelope not found');
      const envelope = result.rows[0];
      if (status === 'signed') await client.query(`UPDATE governed_documents SET status='signed',updated_at=NOW() WHERE id=$1`, [envelope.document_id]);
      const document = await client.query(`SELECT matter_id FROM governed_documents WHERE id=$1`, [envelope.document_id]);
      await appendAudit(client, { matterId: document.rows[0].matter_id, action: `signature.${status}`, entityType: 'document', entityId: envelope.document_id, details: { envelopeId: event.envelopeId, error: event.error || null } });
    });
    res.status(204).end();
  } catch (error) { sendError(res, error); }
});

module.exports = { router, webhookRouter };
