import http from 'node:http';
import { readFile } from 'node:fs/promises';

// Keep generated code on a separate origin from the trusted local studio.
// Only the three reviewed static files are served, never run control or credentials.
const root = new URL('../examples/source-derived-game/', import.meta.url);
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/game.js', ['game.js', 'text/javascript; charset=utf-8']],
]);
const server = http.createServer(async (request, response) => {
  if (!['127.0.0.1:3130', 'localhost:3130'].includes(request.headers.host || '')) {
    response.writeHead(403).end(); return;
  }
  const file = files.get((request.url || '/').split('?')[0]);
  if (!['GET', 'HEAD'].includes(request.method || '') || !file) {
    response.writeHead(404).end(); return;
  }
  try {
    const content = await readFile(new URL(file[0], root));
    response.writeHead(200, { 'Content-Type': file[1], 'Content-Length': content.length, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'" });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch { response.writeHead(500).end('The example files could not be read.'); }
});
server.on('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(3130, '127.0.0.1', () => console.log('Previously generated and independently checked example: http://127.0.0.1:3130/'));
