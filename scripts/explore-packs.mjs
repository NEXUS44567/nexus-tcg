// Exploration ponctuelle : images officielles des produits One Piece (boosters, displays)
import fs from 'node:fs';
const UA = { 'User-Agent': 'Mozilla/5.0 (NEXUS-TCG; github.com/NEXUS44567/nexus-tcg)' };
async function txt(url) { try { const r = await fetch(url, { headers: UA }); const t = await r.text(); return { status: r.status, t }; } catch (e) { return { status: 0, t: String(e) }; } }
const out = {};
for (const [k, base] of [['en', 'https://en.onepiece-cardgame.com'], ['jp', 'https://www.onepiece-cardgame.com'], ['fr', 'https://fr.onepiece-cardgame.com']]) {
  for (const path of ['/products/', '/products/boosters/', '/products/index.php']) {
    const p = await txt(base + path);
    const imgs = [...p.t.matchAll(/<img[^>]+(?:data-src|src)="([^"]+)"[^>]*>/g)].map((m) => m[0].slice(0, 300)).slice(0, 80);
    const links = [...new Set([...p.t.matchAll(/href="([^"]*products[^"]*)"/g)].map((m) => m[1]))].slice(0, 120);
    out[k + path] = { status: p.status, len: p.t.length, imgs, links };
  }
}
// une page produit en détail
const en = out['en/products/'];
const first = (en?.links || []).find((l) => /op-?1[0-9]|op17|booster/i.test(l));
if (first) { const u = first.startsWith('http') ? first : 'https://en.onepiece-cardgame.com' + (first.startsWith('/') ? '' : '/products/') + first.replace(/^\.\.?\//, ''); const p = await txt(u); out.detail = { url: u, status: p.status, imgs: [...p.t.matchAll(/<img[^>]+(?:data-src|src)="([^"]+)"[^>]*>/g)].map((m) => m[0].slice(0, 300)).slice(0, 60) }; }
fs.mkdirSync('db/_explore', { recursive: true });
fs.writeFileSync('db/_explore/packs.json', JSON.stringify(out, null, 1));
