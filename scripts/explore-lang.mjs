// Exploration ponctuelle n°2 : structure des listes officielles One Piece (FR, JP) et images TCGdex JP
import fs from 'node:fs';
const out = {};
const UA = { 'User-Agent': 'Mozilla/5.0 (NEXUS-TCG; github.com/NEXUS44567/nexus-tcg)' };
async function txt(url, opt = {}) { try { const r = await fetch(url, { headers: UA, ...opt }); const t = await r.text(); return { status: r.status, len: t.length, t }; } catch (e) { return { error: String(e) }; } }
async function j(url) { const r = await txt(url); try { return JSON.parse(r.t); } catch { return r; } }
for (const [k, base] of [['fr', 'https://fr.onepiece-cardgame.com'], ['jp', 'https://www.onepiece-cardgame.com'], ['en', 'https://en.onepiece-cardgame.com']]) {
  const p = await txt(base + '/cardlist/');
  const t = p.t || '';
  const opts = [...t.matchAll(/<option value="(\d+)"[^>]*>([^<]*)<\/option>/g)].map((m) => [m[1], m[2].trim()]);
  const imgs = [...t.matchAll(/(?:data-src|src)="([^"]*cardlist\/card\/[^"]+)"/g)].map((m) => m[1]).slice(0, 8);
  const i = t.indexOf('modalCol'); 
  out[k] = { status: p.status, len: p.len, options: opts.slice(0, 80), imgs, sample: i > 0 ? t.slice(i - 200, i + 2500) : t.slice(0, 1500), form: (t.match(/<form[\s\S]{0,1500}?<\/form>/) || [''])[0].slice(0, 1500) };
  // une série en détail (la première option numérique)
  if (opts[0]) {
    const q = await txt(base + '/cardlist/?series=' + opts[0][0]);
    const tt = q.t || '';
    const ii = tt.indexOf('modalCol');
    out[k + '_series'] = { id: opts[0][0], status: q.status, len: q.len, nCards: (tt.match(/class="modalCol"/g) || []).length, imgs: [...tt.matchAll(/(?:data-src|src)="([^"]*cardlist\/card\/[^"]+)"/g)].map((m) => m[1]).slice(0, 6), sample: ii > 0 ? tt.slice(ii - 100, ii + 2200) : tt.slice(0, 800) };
  }
}
// TCGdex JP : présence des images sur quelques séries
const sets = await j('https://api.tcgdex.net/v2/ja/sets');
out.ja_img = [];
if (Array.isArray(sets)) for (const s of [sets[0], sets[40], sets[90], sets[140], sets.at(-1), sets.at(-5)].filter(Boolean)) {
  const d = await j(`https://api.tcgdex.net/v2/ja/sets/${encodeURIComponent(s.id)}`);
  const cs = d.cards || [];
  out.ja_img.push({ id: s.id, name: s.name, n: cs.length, withImage: cs.filter((c) => c.image).length, ex: cs.find((c) => c.image)?.image || null, logo: d.logo || null });
}
// TCGdex : un set complet FR (liste) pour voir le champ image
const fr = await j('https://api.tcgdex.net/v2/fr/sets/me05');
out.fr_me05 = { n: fr.cards?.length, first: fr.cards?.slice(0, 3), logo: fr.logo };
const en = await j('https://api.tcgdex.net/v2/en/sets');
out.en_sets_sample = Array.isArray(en) ? en.slice(-12) : null;
fs.mkdirSync('db/_explore', { recursive: true });
fs.writeFileSync('db/_explore/report2.json', JSON.stringify(out, null, 1));
console.log('ok');
