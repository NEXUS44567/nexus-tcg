// Construit Kirakai (V3) dans ce dossier (servi par GitHub Pages sous /nexus-tcg/v3/) : index.html + assets/ + sw.js.
// Le site V2 (racine du dépôt) n'est pas modifié : la V3 lit seulement ses données dans ../db/ et ../img/.
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const APP = path.join(ROOT, 'app');
const OUT = path.join(ROOT, 'assets');
const dev = process.argv.includes('--dev');

const res = await build({
  entryPoints: [path.join(APP, 'src/main.jsx')],
  bundle: true, minify: !dev, sourcemap: false, format: 'esm', target: ['es2020', 'safari15'],
  outdir: path.join(ROOT, '.build'), write: false, jsx: 'automatic',
  define: { 'process.env.NODE_ENV': dev ? '"development"' : '"production"' },
  loader: { '.jsx': 'jsx', '.svg': 'text' }, legalComments: 'none', logLevel: 'warning',
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
// Chargeur au nom fixe pour les pages de cartes et d'extensions (seo.mjs) : elles n'ont pas à être réécrites à chaque version
const css = /href="(assets\/app\.[0-9a-f]+\.css)"/.exec(html)?.[1], js = /src="(assets\/app\.[0-9a-f]+\.js)"/.exec(html)?.[1];
fs.writeFileSync(path.join(ROOT, 'boot.js'), `(function(){var d=document,l=d.createElement('link');l.rel='stylesheet';l.href=${JSON.stringify(css)};d.head.appendChild(l);var s=d.createElement('script');s.type='module';s.src=${JSON.stringify(js)};d.head.appendChild(s)})();\n`);
fs.copyFileSync(path.join(APP, 'manifest.json'), path.join(ROOT, 'manifest.webmanifest'));

// Service worker propre à la V3 (portée /v3/) : sa version suit celle des fichiers construits
const version = crypto.createHash('sha1').update(res.outputFiles.map((f) => f.path + f.contents.length).join('|') + html).digest('hex').slice(0, 10);
fs.writeFileSync(path.join(ROOT, 'sw.js'), fs.readFileSync(path.join(APP, 'sw.js'), 'utf8').replace('__VERSION__', version));

// Première visite d'un navigateur qui a déjà le service worker de la V2 : celui-ci répond à toute
// navigation sous /nexus-tcg/ avec la page de la V2, qui cherche alors son script dans v3/assets/.
// On y place un petit script qui retire ce service worker et recharge : la V3 s'ouvre, enregistre le sien
// (portée plus précise, donc prioritaire ensuite), et la V2 réinstalle le sien à sa prochaine visite.
const v2 = fs.readFileSync(path.join(ROOT, '..', 'index.html'), 'utf8');
const v2js = /assets\/(app\.[0-9a-f]+\.js)/.exec(v2)?.[1];
if (v2js) {
  const heal = `(async()=>{const k='nexus3.heal';if(sessionStorage.getItem(k)){sessionStorage.removeItem(k);document.body.innerHTML='<p style="font:16px system-ui;color:#fff;background:#07080d;margin:0;min-height:100vh;display:grid;place-items:center">Kirakai · <a style="color:#ffd23f" href="./">recharger la page</a></p>';return}sessionStorage.setItem(k,'1');try{const r=await navigator.serviceWorker?.getRegistration();if(r)await r.unregister()}catch(e){}location.reload()})();\n`;
  fs.writeFileSync(path.join(OUT, v2js), heal);
  // même relais pour les pages de cartes et d'extensions (leur dossier « assets » relatif)
  for (const dir of ['carte', 'extension']) { fs.mkdirSync(path.join(ROOT, dir, 'assets'), { recursive: true }); fs.writeFileSync(path.join(ROOT, dir, 'assets', v2js), heal); }
  console.log('relais V2 :', v2js);
}
console.log('Kirakai construit.');
