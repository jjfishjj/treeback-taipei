import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
function arg(name, fallback) {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
}
const root = path.resolve(fileURLToPath(new URL('../', import.meta.url)), arg('dir', 'public'));
const host = arg('host', '127.0.0.1');
const port = Number(arg('port', '3000'));
const inputBase = arg('base', '/');
const base = inputBase === '/' ? '/' : `/${inputBase.replace(/^\/+|\/+$/g, '')}/`;
const types = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.csv':'text/csv', '.md':'text/markdown' };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    if (base !== '/' && pathname === base.slice(0, -1)) {
      response.writeHead(302, { Location: base }); response.end(); return;
    }
    if (!pathname.startsWith(base)) {
      response.writeHead(404); response.end('Not found'); return;
    }
    const relative = pathname.slice(base.length) || 'index.html';
    const target = path.resolve(root, relative);
    if (!target.startsWith(`${root}${path.sep}`) || relative.split('/').some(p => p.startsWith('.'))) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    const file = (await stat(target)).isDirectory() ? path.join(target, 'index.html') : target;
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': `${types[path.extname(file)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(404); response.end('Not found');
  }
});
server.listen(port, host, () => console.log(`TreeBack static server: http://${host}:${port}${base}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, () => server.close(() => process.exit(0)));
