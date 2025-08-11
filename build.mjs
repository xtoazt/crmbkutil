import { rmSync, mkdirSync, cpSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const publicDir = join(root, 'public');

const keep = new Set([
  'Alternatives', 'Cheats', 'Exploits', 'Gxmes', 'Hubs', 'Important', 'Leisure', 'Mixes (Prxes)', 'OS', 'Prxes', 'Random', 'Tutorials',
  'WEBSITES.md', 'LICENSE', 'README.md', 'style.css', 'cloak.png', 'particles.js', 'css', 'index.html', '404.html'
]);

function isKeep(file) {
  return keep.has(file);
}

function cleanPublic() {
  try { rmSync(publicDir, { recursive: true, force: true }); } catch {}
  mkdirSync(publicDir, { recursive: true });
}

function copyRecursively(src, dest) {
  const entries = readdirSync(src);
  for (const name of entries) {
    if (!isKeep(name)) continue;
    const from = join(src, name);
    const to = join(dest, name);
    const s = statSync(from);
    if (s.isDirectory()) {
      mkdirSync(to, { recursive: true });
      cpSync(from, to, { recursive: true });
    } else {
      cpSync(from, to);
    }
  }
}

cleanPublic();
copyRecursively(root, publicDir);
console.log('Prepared public/ with static assets.');


