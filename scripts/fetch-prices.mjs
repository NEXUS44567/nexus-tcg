// Robot de prix NEXUS : relève les prix réels une fois par jour (GitHub Actions).
//  - One Piece : optcgapi.com (prix de marché TCGplayer, en dollars, converti en euros au taux BCE du jour)
//  - Pokémon   : api.pokemontcg.io (prix Cardmarket en euros + TCGplayer en dollars)
// Écrit :
//  db/prices/<jeu>.json        dernier relevé, par carte
//  db/history/<jeu>/<set>.json historique quotidien (180 jours max)
//  db/market.json              podium, hausses, baisses, sources et dates
// Aucune valeur inventée : une carte sans prix relevé reste sans prix.
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const DB = path.join(ROOT, 'db');
const HISTORY_DAYS = 180;
const now = new Date();
const today = now.toISOString().slice(0, 10);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const readJSON = (p, fallback) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } };
const writeJSON = (p, v) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify(v)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const round = (n) => (n == null || !isFinite(n) ? null : Math.round(n * 100) / 100);
const num = (v) => { if (v == null || v === '') return null; const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isFinite(n) && n > 0 ? n : null; };

async function getJSON(url, { tries = 4, headers = {} } = {}) {
  let last;
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'NEXUS-TCG-price-bot (github.com/NEXUS44567/nexus-tcg)', Accept: 'application/json', ...headers }, signal: AbortSignal.timeout(60000) });
      if (r.status === 429 || r.status >= 500) { last = new Error('HTTP ' + r.status); await sleep(3000 * (i + 1)); continue; }
      if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
      return await r.json();
    } catch (e) { last = e; await sleep(2000 * (i + 1)); }
  }
  throw last;
}

// ---------- Taux de change ----------
async function usdToEur() {
  const prev = readJSON(path.join(DB, 'market.json'), {})?.fx;
  const tries = [
    ['https://api.frankfurter.app/latest?from=USD&to=EUR', (j) => [j.rates?.EUR, j.date, 'BCE via frankfurter.app']],
    ['https://open.er-api.com/v6/latest/USD', (j) => [j.rates?.EUR, (j.time_last_update_utc || '').slice(0, 16), 'open.er-api.com']],
  ];
  for (const [u, pick] of tries) {
    try { const [rate, date, src] = pick(await getJSON(u, { tries: 2 })); if (rate > 0) return { usdEur: rate, date, source: src }; } catch (e) { log('fx', u, e.message); }
  }
  if (prev?.usdEur) return { ...prev, stale: true };
  throw new Error('Aucun taux de change disponible');
}

// ---------- One Piece ----------
async function onePiece(catalog, fx) {
  const ids = new Set(catalog.cards.map((c) => c[0]));
  const endpoints = ['https://optcgapi.com/api/allSetCards/', 'https://optcgapi.com/api/allSTCards/', 'https://optcgapi.com/api/allPromoCards/'];
  const rows = [];
  for (const u of endpoints) {
    try { const j = await getJSON(u); const arr = Array.isArray(j) ? j : j.results || j.data || []; log('optcgapi', u, arr.length, 'lignes'); rows.push(...arr); }
    catch (e) { log('optcgapi échec', u, e.message); }
  }
  if (rows.length) log('exemple optcgapi', JSON.stringify(rows[0]).slice(0, 600));
  const items = {};
  let matched = 0, unmatched = 0, latestScrape = null;
  for (const r of rows) {
    const imgId = r.card_image_id || (r.card_image || '').split('/').pop()?.replace(/\.(jpg|png|webp)$/i, '');
    const id = ids.has(imgId) ? imgId : ids.has(r.card_set_id) && !imgId ? r.card_set_id : null;
    const usd = num(r.market_price) ?? num(r.inventory_price);
    if (!id || usd == null) { unmatched++; continue; }
    const prev = items[id];
    if (prev && prev[1] >= usd) continue;
    items[id] = [round(usd * fx.usdEur), round(usd), round(num(r.inventory_price))];
    matched++;
    const d = r.date_scraped || r.date || null;
    if (d && (!latestScrape || d > latestScrape)) latestScrape = d;
  }
  log('One Piece : prix associés', matched, 'non associés', unmatched);
  return {
    game: 'onepiece', updatedAt: now.toISOString(), sourceDate: latestScrape,
    source: { name: 'TCGplayer (prix de marché) via optcgapi.com', url: 'https://optcgapi.com', currency: 'USD', converted: 'EUR', fx },
    fields: ['eur', 'usd_market', 'usd_inventory'], items,
  };
}

// ---------- Pokémon ----------
async function pokemon(catalog) {
  const ids = new Set(catalog.cards.map((c) => c[0]));
  const items = {};
  const headers = process.env.POKEMONTCG_API_KEY ? { 'X-Api-Key': process.env.POKEMONTCG_API_KEY } : {};
  let page = 1, total = Infinity, seen = 0, matched = 0, latest = null;
  while ((page - 1) * 250 < total && page < 200) {
    const u = `https://api.pokemontcg.io/v2/cards?page=${page}&pageSize=250&select=id,cardmarket,tcgplayer&orderBy=id`;
    let j;
    try { j = await getJSON(u, { headers, tries: 5 }); } catch (e) { log('pokemontcg échec page', page, e.message); if (page === 1) throw e; break; }
    total = j.totalCount ?? 0;
    if (page === 1) log('pokemontcg total', total, 'exemple', JSON.stringify(j.data?.[0]).slice(0, 500));
    for (const c of j.data || []) {
      seen++;
      if (!ids.has(c.id)) continue;
      const cm = c.cardmarket?.prices || {};
      const tp = c.tcgplayer?.prices || {};
      const tpMarket = Math.max(0, ...Object.values(tp).map((p) => num(p?.market) || 0)) || null;
      const eur = num(cm.trendPrice) ?? num(cm.averageSellPrice) ?? num(cm.avg7) ?? num(cm.avg30);
      if (eur == null && tpMarket == null) continue;
      items[c.id] = [round(eur), round(num(cm.avg1)), round(num(cm.avg7)), round(num(cm.avg30)), round(num(cm.lowPrice)), round(tpMarket)];
      matched++;
      const d = c.cardmarket?.updatedAt;
      if (d && (!latest || d > latest)) latest = d;
    }
    page++;
    await sleep(headers['X-Api-Key'] ? 300 : 2100);
  }
  log('Pokémon : cartes vues', seen, 'avec prix', matched);
  return {
    game: 'pokemon', updatedAt: now.toISOString(), sourceDate: latest,
    source: { name: 'Cardmarket (tendance) et TCGplayer via api.pokemontcg.io', url: 'https://pokemontcg.io', currency: 'EUR' },
    fields: ['eur_trend', 'eur_avg1', 'eur_avg7', 'eur_avg30', 'eur_low', 'usd_tcgplayer'], items,
  };
}

// ---------- Historique ----------
function updateHistory(game, catalog, prices) {
  const bySet = new Map();
  for (const c of catalog.cards) { if (!bySet.has(c[2])) bySet.set(c[2], []); bySet.get(c[2]).push(c[0]); }
  for (const [set, cardIds] of bySet) {
    const p = path.join(DB, 'history', game, set + '.json');
    const h = readJSON(p, { d: [], p: {} });
    let idx = h.d.indexOf(today);
    if (idx === -1) { h.d.push(today); idx = h.d.length - 1; for (const k in h.p) h.p[k].push(null); }
    let any = false;
    for (const id of cardIds) {
      const v = prices.items[id]?.[0] ?? null;
      if (v == null && !h.p[id]) continue;
      if (!h.p[id]) h.p[id] = new Array(h.d.length).fill(null);
      h.p[id][idx] = v;
      if (v != null) any = true;
    }
    const extra = h.d.length - HISTORY_DAYS;
    if (extra > 0) { h.d.splice(0, extra); for (const k in h.p) h.p[k].splice(0, extra); }
    if (any || fs.existsSync(p)) writeJSON(p, h);
  }
}

function lastTwo(series) {
  let a = null, b = null;
  for (let i = series.length - 1; i >= 0; i--) { if (series[i] == null) continue; if (b == null) b = series[i]; else { a = series[i]; break; } }
  return [a, b];
}

function market(cats, all, fx) {
  const out = { updatedAt: now.toISOString(), fx, games: {} };
  for (const [game, cat] of Object.entries(cats)) {
    const prices = all[game];
    const byId = new Map(cat.cards.map((c) => [c[0], c]));
    const list = Object.entries(prices.items).filter(([, v]) => v[0] != null).map(([id, v]) => ({ id, eur: v[0], c: byId.get(id) })).filter((x) => x.c);
    list.sort((a, b) => b.eur - a.eur);
    const podium = list.slice(0, 25).map((x) => [x.id, x.eur]);

    const day = [], week = [];
    const histDir = path.join(DB, 'history', game);
    for (const f of fs.existsSync(histDir) ? fs.readdirSync(histDir) : []) {
      const h = readJSON(path.join(histDir, f), null); if (!h) continue;
      for (const [id, s] of Object.entries(h.p)) {
        const [a, b] = lastTwo(s);
        if (a != null && b != null && b >= 5 && a !== b) day.push([id, a, b, round(((b - a) / a) * 100)]);
        const n = s.length; const old = s.slice(Math.max(0, n - 8), Math.max(0, n - 6)).find((v) => v != null);
        if (old != null && b != null && b >= 5 && n >= 7 && old !== b) week.push([id, old, b, round(((b - old) / old) * 100)]);
      }
    }
    // Pokémon : tendance sur 7 jours fournie par Cardmarket (moyenne 7 j vs moyenne 30 j)
    if (game === 'pokemon' && week.length < 20) {
      for (const [id, v] of Object.entries(prices.items)) {
        const [eur, , a7, a30] = v;
        if (eur != null && a7 != null && a30 != null && eur >= 5 && a30 > 0 && a7 !== a30) week.push([id, a30, a7, round(((a7 - a30) / a30) * 100), 'cm']);
      }
    }
    const sortUp = (a, b) => b[3] - a[3];
    const pick = (arr) => ({ up: arr.filter((x) => x[3] > 0).sort(sortUp).slice(0, 12), down: arr.filter((x) => x[3] < 0).sort((a, b) => a[3] - b[3]).slice(0, 12) });
    const total = list.reduce((s, x) => s + x.eur, 0);
    out.games[game] = {
      source: prices.source, sourceDate: prices.sourceDate, priced: list.length, cards: cat.cards.length,
      podium, day: pick(day), week: pick(week), weekNote: week.some((x) => x[4] === 'cm') ? 'Moyenne Cardmarket sur 7 jours comparée à la moyenne sur 30 jours' : 'Écart entre le relevé d’il y a 7 jours et celui du jour',
      marketCap: round(total),
    };
  }
  return out;
}

// ---------- Programme ----------
const cats = { onepiece: readJSON(path.join(DB, 'catalog', 'onepiece.json')), pokemon: readJSON(path.join(DB, 'catalog', 'pokemon.json')) };
const fx = await usdToEur();
log('taux USD→EUR', fx);
const all = {};
const failures = [];
for (const [game, fn] of [['onepiece', onePiece], ['pokemon', pokemon]]) {
  try {
    const res = await fn(cats[game], fx);
    if (Object.keys(res.items).length < 50) throw new Error('trop peu de prix relevés (' + Object.keys(res.items).length + ')');
    all[game] = res;
    writeJSON(path.join(DB, 'prices', game + '.json'), res);
    updateHistory(game, cats[game], res);
  } catch (e) {
    failures.push(game + ': ' + e.message);
    log('ÉCHEC', game, e.message);
    const prev = readJSON(path.join(DB, 'prices', game + '.json'), null);
    if (prev) { all[game] = prev; log('on garde le relevé précédent du', prev.updatedAt); }
    else all[game] = { game, items: {}, source: null, sourceDate: null };
  }
}
writeJSON(path.join(DB, 'market.json'), { ...market(cats, all, fx), failures });
log('terminé', failures.length ? 'avec échecs : ' + failures.join(' | ') : 'sans échec');
if (failures.length === 2) process.exit(1);
