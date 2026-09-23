// Shared Playwright setup for tools/capture.mjs and tools/qa.mjs.
//
// Uses the globally installed Playwright + the Chromium in /opt/pw-browsers
// (never `playwright install`). CDN requests are answered from the pinned
// copies in tools/node_modules, so captures and QA are deterministic and work
// offline or behind a TLS-intercepting proxy. Google Fonts are skipped (the
// canvas never needs them; classic screenshots fall back to system serifs).
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MODULES = join(HERE, '..', 'node_modules');

function loadPlaywright() {
  for (const base of [join(HERE, '..') + '/', execSync('npm root -g').toString().trim() + '/']) {
    try {
      return createRequire(base)('playwright');
    } catch {}
  }
  throw new Error('playwright not found (expected a global install)');
}

export const { chromium } = loadPlaywright();

export const GL_ARGS = ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'];

const TYPES = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.wasm': 'application/wasm', '.css': 'text/css' };

const pinned = (pkg) => {
  try {
    return JSON.parse(readFileSync(join(MODULES, pkg, 'package.json'), 'utf8')).version;
  } catch {
    return null;
  }
};

/** Answer jsdelivr requests for the pinned packages from node_modules (exact versions only). */
export async function routeCdn(context) {
  await context.route('https://cdn.jsdelivr.net/npm/**', async (route) => {
    const url = new URL(route.request().url());
    const m = url.pathname.match(/^\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/?(.*)$/);
    if (!m) return route.abort();
    const [, pkg, version, rest] = m;
    if (pinned(pkg) !== version) return route.abort('blockedbyclient'); // not ours: other pages' own CDN deps
    if (rest === '+esm') {
      // three's +esm bundle ≈ build/three.module.js; relative import keeps one instance
      const entry = pkg === 'three' ? './build/three.module.js' : './index.js';
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: `export * from '${entry}';\n` });
    }
    const file = join(MODULES, pkg, rest);
    if (!existsSync(file)) return route.fulfill({ status: 404, body: 'not in tools/node_modules: ' + file });
    route.fulfill({ status: 200, contentType: TYPES[extname(file)] || 'application/octet-stream', body: readFileSync(file) });
  });
  await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
}

export async function launch() {
  return chromium.launch({ args: GL_ARGS });
}
