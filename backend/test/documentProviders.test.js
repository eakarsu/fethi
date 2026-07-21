const test = require('node:test');
const assert = require('node:assert/strict');
const providers = require('../services/documentProviders');

function without(keys, work) {
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  for (const key of keys) delete process.env[key];
  return Promise.resolve().then(work).finally(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });
}

test('OCR fails closed without provider credentials', async () => {
  await without(['OCR_API_URL', 'OCR_API_TOKEN'], async () => {
    await assert.rejects(providers.extractText({}), (error) => error.statusCode === 503);
  });
});

test('e-signature fails closed without provider credentials', async () => {
  await without(['ESIGN_API_URL', 'ESIGN_API_TOKEN'], async () => {
    await assert.rejects(providers.createEnvelope({}), (error) => error.statusCode === 503);
  });
});

test('filing fails closed without provider credentials', async () => {
  await without(['FILING_API_URL', 'FILING_API_TOKEN'], async () => {
    await assert.rejects(providers.submitFiling({}), (error) => error.statusCode === 503);
  });
});

test('storage fails closed without provider credentials', async () => {
  await without(['STORAGE_API_URL', 'STORAGE_API_TOKEN'], async () => {
    await assert.rejects(providers.storeObject({}), (error) => error.statusCode === 503);
  });
});

test('authoritative templates fail closed without provider credentials', async () => {
  await without(['TEMPLATE_API_URL', 'TEMPLATE_API_TOKEN'], async () => {
    await assert.rejects(providers.fetchTemplate('lease', 'NY-US', '2026-07-19'), (error) => error.statusCode === 503);
  });
});
