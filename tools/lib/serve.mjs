// A tiny static file server for the repo root (no dependencies), used by
// capture.mjs and qa.mjs. Serves .glb.gz as-is, like GitHub Pages does.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO = resolve(fileURLToPath(import.meta.url), '../../..');
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg',
  '.gz': 'application/gzip', '.glb': 'model/gltf-binary', '.csv': 'text/csv', '.md': 'text/markdown', '.jsx': 'text/javascript',
};

export function serve(root = REPO) {
  const server = createServer(async (req, res) => {
    try {
      let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (path.endsWith('/')) path += 'index.html';
      const file = normalize(join(root, path));
      if (!file.startsWith(root)) throw new Error('outside root');
      const st = await stat(file);
      if (st.isDirectory()) throw new Error('dir');
      res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'content-length': st.size });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' });
      res.end('not found');
    }
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok({ server, url: `http://127.0.0.1:${server.address().port}/` })));
}
