const { sha256, stableJson } = require('../lib/documentPolicy');

async function appendAudit(client, { matterId = null, actorId = null, action, entityType, entityId, details = {} }) {
  await client.query('SELECT pg_advisory_xact_lock($1)', [734291]);
  const previous = await client.query('SELECT event_hash FROM audit_events ORDER BY id DESC LIMIT 1');
  const previousHash = previous.rows[0]?.event_hash || null;
  const occurredAt = new Date().toISOString();
  const normalizedMatterId = matterId == null ? null : Number(matterId);
  const normalizedActorId = actorId == null ? null : Number(actorId);
  const payload = { matterId: normalizedMatterId, actorId: normalizedActorId, action, entityType, entityId: String(entityId), details, previousHash, occurredAt };
  const eventHash = sha256(stableJson(payload));
  const result = await client.query(
    `INSERT INTO audit_events
       (matter_id, actor_id, action, entity_type, entity_id, details, previous_hash, event_hash, occurred_at)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9) RETURNING *`,
    [normalizedMatterId, normalizedActorId, action, entityType, String(entityId), JSON.stringify(details), previousHash, eventHash, occurredAt]
  );
  return result.rows[0];
}

async function verifyAuditChain(client) {
  const result = await client.query('SELECT * FROM audit_events ORDER BY id');
  let previousHash = null;
  for (const event of result.rows) {
    const occurredAt = new Date(event.occurred_at).toISOString();
    const payload = {
      matterId: event.matter_id == null ? null : Number(event.matter_id),
      actorId: event.actor_id == null ? null : Number(event.actor_id),
      action: event.action,
      entityType: event.entity_type,
      entityId: event.entity_id,
      details: event.details,
      previousHash,
      occurredAt,
    };
    if (event.previous_hash !== previousHash || event.event_hash !== sha256(stableJson(payload))) return false;
    previousHash = event.event_hash;
  }
  return true;
}

module.exports = { appendAudit, verifyAuditChain };
