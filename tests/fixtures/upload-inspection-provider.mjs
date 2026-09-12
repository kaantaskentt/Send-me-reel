// Preloaded only by the local worker regression test. No real provider access.
import fs from 'node:fs/promises';
import path from 'node:path';

const slowDeleteDirectory = process.env.CONTEXTDROP_TEST_SLOW_DELETE_DIRECTORY;
globalThis.fetch = async (input, init) => {
  const url = String(input);
  if (!url.startsWith('https://generativelanguage.googleapis.com/')) throw new Error('Unexpected fixture request');
  if (url.endsWith('/upload/v1beta/files')) return new Response('', { headers: { 'x-goog-upload-url': 'https://generativelanguage.googleapis.com/upload/v1beta/files?upload_id=fixture' } });
  if (url.includes('upload_id=fixture')) return Response.json({ file: { name: 'files/fixture', uri: 'https://generativelanguage.googleapis.com/v1beta/files/fixture', mimeType: 'image/jpeg', state: 'ACTIVE' } });
  if (init?.method === 'DELETE') {
    if (slowDeleteDirectory) {
      await fs.writeFile(path.join(slowDeleteDirectory, 'delete-state'), 'started');
      // Exceed the generic worker's 3s grace, but remain inside Gemini's 15s
      // cleanup deadline. This catches shortening the inspection grace again.
      await new Promise(resolve => setTimeout(resolve, 4000));
      await fs.writeFile(path.join(slowDeleteDirectory, 'delete-state'), 'finished');
    }
    return new Response('');
  }
  if (url.includes(':generateContent') && slowDeleteDirectory) {
    await fs.writeFile(path.join(slowDeleteDirectory, 'generation-started'), 'ready');
    init.signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      init.signal.addEventListener('abort', () => reject(init.signal.reason), { once: true });
    });
  }
  if (url.includes(':generateContent')) return Response.json({
    candidates: [{ finishReason: 'STOP', content: { parts: [{ text: JSON.stringify({
      summary: 'Fixture source only.', limitations: [], observations: [{ page: 1, description: 'A test repository.', onScreenText: ['example/project'], urls: ['https://github.com/example/project'], tools: ['GitHub'], speech: '', uncertain: false }],
    }) }] } }],
    usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 20, totalTokenCount: 120 },
  });
  throw new Error('Unexpected fixture provider operation');
};
