import http from 'node:http';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import { resolvePublicUrl } from '../src/services/publicUrl.js';

export type ResolveDestination = typeof resolvePublicUrl;
/** A loopback proxy pins sockets to checked public IPs, closing the DNS-rebinding gap. */
export async function createBrowserEgress(resolve: ResolveDestination = resolvePublicUrl) {
  const sockets = new Set<net.Socket>();
  let closed = false;
  const track = (socket: net.Socket) => {
    if (closed) { socket.destroy(); return; }
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
  };
  const server = http.createServer(async (request, response) => {
    try {
      const { url, addresses } = await resolve(request.url || '');
      if (closed || response.destroyed) throw new Error('Proxy closed');
      if (url.protocol !== 'http:') throw new Error('Use CONNECT for HTTPS');
      const headers: http.OutgoingHttpHeaders = { ...request.headers, host: url.host };
      delete headers['proxy-authorization'];
      delete headers['proxy-connection'];
      const upstream = http.request({ hostname: addresses[0]!.address, port: Number(url.port || 80), path: `${url.pathname}${url.search}`, method: request.method, headers, timeout: 30_000 }, res => {
        response.writeHead(res.statusCode || 502, res.headers);
        let bytes = 0;
        res.on('data', chunk => { bytes += chunk.length; if (bytes > 100 * 1024 * 1024) { res.destroy(); response.destroy(); } });
        res.pipe(response);
      });
      upstream.on('timeout', () => upstream.destroy(new Error('Request timed out')));
      upstream.on('error', () => { if (!response.headersSent) response.writeHead(502); response.end(); });
      upstream.on('socket', track);
      response.on('close', () => upstream.destroy());
      request.pipe(upstream);
    } catch { response.writeHead(403); response.end('Private network destination blocked'); }
  });
  server.on('connect', async (request, client, head) => {
    try {
      const destination = new URL(`https://${request.url}`);
      const { addresses } = await resolve(destination.href);
      if (closed || client.destroyed) throw new Error('Proxy closed');
      const upstream = net.connect({ host: addresses[0]!.address, port: Number(destination.port || 443) });
      track(upstream);
      upstream.on('close', () => client.destroy());
      upstream.setTimeout(90_000, () => upstream.destroy());
      upstream.on('connect', () => {
        client.write('HTTP/1.1 200 Connection Established\r\n\r\n');
        if (head.length) upstream.write(head);
        let bytes = 0;
        upstream.on('data', chunk => { bytes += chunk.length; if (bytes > 100 * 1024 * 1024) upstream.destroy(); });
        upstream.pipe(client); client.pipe(upstream);
      });
      upstream.on('error', () => client.destroy());
      client.on('error', () => upstream.destroy());
      client.on('close', () => upstream.destroy());
    } catch { client.end('HTTP/1.1 403 Forbidden\r\n\r\n'); }
  });
  server.on('connection', track);
  server.headersTimeout = 10_000;
  await new Promise<void>((resolveListen, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolveListen); });
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => { if (closed) return; closed = true; for (const socket of sockets) socket.destroy(); server.close(); } };
}
