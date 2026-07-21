const PROVIDERS = Object.freeze({
  ocr: ['OCR_API_URL', 'OCR_API_TOKEN'],
  signature: ['ESIGN_API_URL', 'ESIGN_API_TOKEN'],
  filing: ['FILING_API_URL', 'FILING_API_TOKEN'],
  storage: ['STORAGE_API_URL', 'STORAGE_API_TOKEN'],
  templates: ['TEMPLATE_API_URL', 'TEMPLATE_API_TOKEN'],
});

function providerConfig(kind) {
  const keys = PROVIDERS[kind];
  if (!keys) throw new Error(`Unknown provider: ${kind}`);
  const [urlKey, tokenKey] = keys;
  const url = process.env[urlKey];
  const token = process.env[tokenKey];
  if (!url || !token) {
    throw Object.assign(new Error(`${kind} provider is not configured (${urlKey} and ${tokenKey} required)`), { statusCode: 503 });
  }
  return { url: url.replace(/\/$/, ''), token };
}

async function providerRequest(kind, path, body, options = {}) {
  const { url, token } = providerConfig(kind);
  const response = await fetch(`${url}${path}`, {
    method: options.method || 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body == null ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(Number(process.env.PROVIDER_TIMEOUT_MS || 15000)),
  });
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!response.ok) {
    throw Object.assign(new Error(`${kind} provider rejected request (${response.status})`), {
      statusCode: 502,
      providerStatus: response.status,
      providerError: data,
    });
  }
  return data;
}

module.exports = {
  extractText: (payload) => providerRequest('ocr', '/v1/extractions', payload),
  createEnvelope: (payload) => providerRequest('signature', '/v1/envelopes', payload),
  submitFiling: (payload) => providerRequest('filing', '/v1/submissions', payload),
  storeObject: (payload) => providerRequest('storage', '/v1/objects', payload),
  fetchTemplate: (externalId, jurisdiction, effectiveDate) => providerRequest(
    'templates',
    `/v1/templates/${encodeURIComponent(externalId)}?jurisdiction=${encodeURIComponent(jurisdiction)}&effective_date=${encodeURIComponent(effectiveDate)}`,
    null,
    { method: 'GET' }
  ),
};
