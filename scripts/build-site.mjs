// Construit le site dans la racine du dépôt (servie par GitHub Pages) : index.html + assets/
import { build } from '/opt/npm-tools/node_modules/esbuild/lib/main.js';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const APP = path.join(ROOT, 'app');
const OUT = path.join(ROOT, 'assets');
const dev = process.argv.includes('--dev');

const res = await build({
  entryPoints: [path.join(APP, 'src/main.jsx')],
  bundle: true, minify: !dev, sourcemap: false, format: 'esm', target: ['es2020', 'safari15'],
  outdir: path.join(ROOT, '.build'), write: false, jsx: 'automatic',
  nodePaths: ['/opt/npm-tools/node_modules', '/home/claude/.npm-global/lib/node_modules', path.join(ROOT, 'node_modules')],
  define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
  loader: { '.jsx': 'jsx' }, legalComments: 'none', logLevel: 'warning',
});
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
let html = fs.readFileSync(path.join(APP, 'index.html'), 'utf8');
for (const f of res.outputFiles) {
  const ext = path.extname(f.path);
  const hash = crypto.createHash('sha1').update(f.contents).digest('hex').slice(0, 8);
  const name = `app.${hash}${ext}`;
  fs.writeFileSync(path.join(OUT, name), f.contents);
  if (ext === '.css') html = html.replace('<!--CSS-->', `<link rel="stylesheet" href="assets/${name}">`);
  if (ext === '.js') html = html.replace('<!--JS-->', `<script type="module" src="assets/${name}"></script>`);
  console.log(name, (f.contents.length / 1024).toFixed(1) + ' Ko');
}
fs.writeFileSync(path.join(ROOT, 'index.html'), html);
fs.copyFileSync(path.join(APP, 'public-manifest.json'), path.join(ROOT, 'manifest.webmanifest'));
fs.writeFileSync(path.join(ROOT, '404.html'), html);
console.log('Site construit.');
