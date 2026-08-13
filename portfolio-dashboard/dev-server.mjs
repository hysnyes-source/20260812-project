import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const mimeTypes = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8' };

createServer((request, response) => {
  const rawPath = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const requested = (rawPath === '/' ? 'index.html' : rawPath).replace(/^[/\\]+/, '');
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(normalize(root)) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }
  response.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
  createReadStream(filePath).pipe(response);
}).listen(4617, '127.0.0.1', () => console.log('Portfolio dashboard: http://127.0.0.1:4617'));
