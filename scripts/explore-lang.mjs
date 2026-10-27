// Exploration ponctuelle : données FR / JP disponibles (TCGdex, sites officiels One Piece, boutiques JP)
import fs from 'node:fs';
const out = {};
const UA = { 'User-Agent': 'NEXUS-TCG-explore (github.com/NEXUS44567/nexus-tcg)' };
async function j(url) { try { const r = await fetch(url, { headers: UA }); const t = await r.text(); let b; try { b = JSON.parse(t); } catch { b = t.slice(0, 3000); } return { status: r.status, body: b }; } catch (e) { return { error: String(e) }; } }
async function head(url) { try { const r = await fetch(url, { headers: UA }); const buf = await r.arrayBuffer(); return { status: r.status, type: r.headers.get('content-type'), size: buf.byteLength }; } catch (e) { return { error: String(e) }; } }
async function txt(url, n = 6000) { try { const r = await fetch(url, { headers: UA }); const t = await r.text(); return { status: r.status, len: t.length, head: t.slice(0, n) }; } catch (e) { return { error: String(e) }; } }

for (const lang of ['fr', 'ja', 'en']) {
  const s = await j(`https://api.tcgdex.net/v2/${lang}/sets`);
  out[lang + '_sets_count'] = Array.isArray(s.body) ? s.body.length : s;
  out[lang + '_sets_last'] = Array.isArray(s.body) ? s.body.slice(-25) : null;
  out[lang + '_series'] = (await j(`https://api.tcgdex.net/v2/${lang}/series`)).body;
}
// un set JP récent en détail
const ja = (await j('https://api.tcgdex.net/v2/ja/sets')).body;
if (Array.isArray(ja)) {
  for (const s of ja.slice(-3)) {
    const d = await j(`https://api.tcgdex.net/v2/ja/sets/${encodeURIComponent(s.id)}`);
    out['ja_set_' + s.id] = d.body && typeof d.body === 'object' ? { ...d.body, cards: d.body.cards?.slice(0, 5), nCards: d.body.cards?.length } : d;
    const first = d.body?.cards?.at(-1);
    if (first) out['ja_card_' + first.id] = (await j(`https://api.tcgdex.net/v2/ja/cards/${encodeURIComponent(first.id)}`)).body;
  }
}
// une carte connue en FR et EN pour comparer prix et images
for (const id of ['sv03.5-199', 'swsh7-215', 'sv08-238', 'me01-001']) {
  out['fr_card_' + id] = (await j(`https://api.tcgdex.net/v2/fr/cards/${id}`)).body;
  out['en_card_' + id] = (await j(`https://api.tcgdex.net/v2/en/cards/${id}`)).body;
}
// One Piece : sites officiels (images par langue)
out.op_img = {
  jp: await head('https://www.onepiece-cardgame.com/images/cardlist/card/OP01-001.png'),
  en: await head('https://en.onepiece-cardgame.com/images/cardlist/card/OP01-001.png'),
  fr: await head('https://fr.onepiece-cardgame.com/images/cardlist/card/OP09-001.png'),
  fr2: await head('https://www.onepiece-cardgame.com/fr/images/cardlist/card/OP09-001.png'),
};
out.op_pages = {
  jp: await txt('https://www.onepiece-cardgame.com/cardlist/', 4000),
  fr: await txt('https://fr.onepiece-cardgame.com/cardlist/', 4000),
  en: await txt('https://en.onepiece-cardgame.com/cardlist/', 2000),
};
// Boutiques japonaises : règles d'accès
out.jp_shops = {
  yuyutei_robots: await txt('https://yuyu-tei.jp/robots.txt', 3000),
  cardrush_robots: await txt('https://www.cardrush-op.jp/robots.txt', 3000),
  cardrushpk_robots: await txt('https://www.cardrush-pokemon.jp/robots.txt', 3000),
};
fs.mkdirSync('db/_explore', { recursive: true });
fs.writeFileSync('db/_explore/report.json', JSON.stringify(out, null, 1));
console.log('ok', Object.keys(out).length);
