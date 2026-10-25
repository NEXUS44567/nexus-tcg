// Composition des boosters virtuels. Les éditeurs ne publient pas de taux officiels :
// les probabilités ci-dessous sont des estimations proches de ce que rapporte la communauté,
// affichées telles quelles à l'utilisateur.
import { eurOf } from './data.js';

const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function weighted(entries) {
  const list = entries.filter(([, w, pool]) => w > 0 && pool && pool.length);
  const total = list.reduce((s, e) => s + e[1], 0);
  let r = Math.random() * total;
  for (const e of list) { if ((r -= e[1]) <= 0) return e; }
  return list.at(-1);
}

// ---- One Piece : 12 cartes (7 C, 3 UC, 1 R, 1 emplacement rare) ----
function onePiecePools(cards) {
  const base = (r) => cards.filter((c) => c.rarity === r && !c.variant);
  const par = cards.filter((c) => /^Parallèle$/.test(c.variant) && ['L', 'SR', 'SEC', 'R'].includes(c.rarity));
  const par2 = cards.filter((c) => /^Parallèle \d/.test(c.variant));
  return { C: base('C'), UC: base('UC'), R: base('R'), L: base('L'), SR: base('SR'), SEC: base('SEC'), SP: cards.filter((c) => c.rarity === 'SP CARD'), TR: base('TR'), PAR: par, PAR2: par2 };
}
const OP_HIT = [
  ['R', 'Rare', 60], ['SR', 'Super rare', 18], ['L', 'Leader', 10], ['PAR', 'Illustration parallèle', 6.5],
  ['SEC', 'Secrète', 3], ['SP', 'SP', 1.5], ['PAR2', 'Parallèle spéciale (manga, alternative)', 0.5], ['TR', 'Treasure Rare', 0.5],
];

// ---- Pokémon (ère Écarlate et Violet / Méga-Évolution) : 10 cartes ----
const PK_TIERS = {
  C: ['Common'], U: ['Uncommon'], R: ['Rare', 'Rare Holo'],
  DR: ['Double Rare', 'Rare Holo ex', 'Rare Holo V', 'Rare Holo VMAX', 'Rare Holo VSTAR', 'Rare Holo EX', 'Rare Holo GX'],
  UR: ['Ultra Rare', 'Rare Ultra'], IR: ['Illustration Rare', 'Trainer Gallery Rare Holo', 'Pikachu Rare', 'Classic Collection'],
  SIR: ['Special Illustration Rare', 'Rare Rainbow'], HR: ['Hyper Rare', 'Mega Hyper Rare', 'Rare Secret', 'Shiny Ultra Rare', 'Black White Rare', 'Futuristic Rare'],
  SH: ['Shiny Rare', 'Rare Shiny'], ACE: ['ACE SPEC Rare', 'MEGA_ATTACK_RARE'],
};
function pokemonPools(cards) {
  const out = {};
  for (const [k, list] of Object.entries(PK_TIERS)) out[k] = cards.filter((c) => list.includes(c.rarity));
  out.CUR = [...out.C, ...out.U, ...out.R];
  return out;
}
const PK_RARE = [['R', 'Rare', 70], ['DR', 'Double rare', 18], ['UR', 'Ultra rare', 6], ['SH', 'Shiny', 3], ['HR', 'Hyper rare', 1.5]];
const PK_REV = [['CUR', 'Reverse', 86], ['IR', 'Illustration rare', 10], ['SIR', 'Illustration spéciale', 2.5], ['ACE', 'ACE SPEC / Méga attaque', 1.5]];

export const TIER_STYLE = {
  C: 0, UC: 0, U: 0, CUR: 1, R: 1, L: 2, SR: 2, DR: 2, PAR: 3, UR: 3, SH: 3, IR: 3, SEC: 4, SP: 4, SIR: 4, ACE: 3, HR: 5, PAR2: 5, TR: 5, LEG: 4,
};

// Un seul booster par univers : la dernière extension principale, 7 cartes par booster
// One Piece : 3 communes, 1 peu commune, 1 rare, 1 bonus, 1 carte de tête
// Pokémon   : 3 communes, 1 peu commune, 1 emplacement libre (reverse), 1 bonus, 1 carte de tête
export const PRICE = { booster: 200, display: 2000, displayPacks: 12, daily: 200, start: 1000 };
export const CURRENCY = { onepiece: { name: 'Berrys', one: 'Berry', sym: '฿' }, pokemon: { name: 'Pokéballs', one: 'Pokéball', sym: '◓' } };
const OP_HEAD = [['R', 'Rare', 40], ['SR', 'Super rare', 30], ['L', 'Leader', 15], ['PAR', 'Illustration parallèle', 9], ['SEC', 'Secrète', 3.5], ['SP', 'SP', 1.5], ['PAR2', 'Parallèle spéciale (manga, alternative)', 0.6], ['TR', 'Treasure Rare', 0.4]];
const OP_BONUS = [['CU', 'Commune ou peu commune', 70], ['R', 'Rare', 20], ['PARLOW', 'Parallèle de commune', 10]];
const PK_HEAD = [['R', 'Rare', 62], ['DR', 'Double rare', 22], ['UR', 'Ultra rare', 8], ['SH', 'Shiny', 4], ['IR', 'Illustration rare', 2.5], ['HR', 'Hyper rare', 1.5]];
const PK_BONUS = [['CUR', 'Reverse', 82], ['IR', 'Illustration rare', 12], ['SIR', 'Illustration spéciale', 3.5], ['ACE', 'ACE SPEC / Méga attaque', 2.5]];

export function buildProduct(game, cats, P, fx) {
  const g = cats[game];
  if (game === 'onepiece') {
    const s = g.setList.find((x) => /Booster/.test(x.series) && /^OP/.test(x.code));
    const cards = g.cards.filter((c) => c.set === s.code);
    const pools = onePiecePools(cards);
    pools.CU = [...pools.C, ...pools.UC];
    pools.PARLOW = cards.filter((c) => c.variant && ['C', 'UC'].includes(c.rarity));
    return { id: 'op-' + s.code, game, set: s, name: s.name, code: s.code, size: 7, cover: topCard(cards, P, fx), pools, cards,
      composition: '3 communes, 1 peu commune, 1 rare, 1 bonus et 1 carte de tête.',
      odds: [['Carte de tête', OP_HEAD.filter(([k]) => pools[k]?.length)], ['Bonus', OP_BONUS.filter(([k]) => pools[k]?.length)]] };
  }
  const s = g.setList.filter((x) => x.count >= 80).find((x) => { const p = pokemonPools(g.cards.filter((c) => c.set === x.code)); return p.C.length >= 3 && p.U.length >= 1 && p.R.length; });
  const cards = g.cards.filter((c) => c.set === s.code);
  const pools = pokemonPools(cards);
  return { id: 'pk-' + s.code, game, set: s, name: s.name, code: s.code, size: 7, cover: topCard(cards, P, fx), pools, cards, logo: s.logo,
    composition: '3 communes, 1 peu commune, 1 emplacement libre (reverse), 1 bonus et 1 carte de tête.',
    odds: [['Carte de tête', PK_HEAD.filter(([k]) => pools[k]?.length)], ['Bonus', PK_BONUS.filter(([k]) => pools[k]?.length)]] };
}

function topCard(cards, P, fx) {
  let best = null, bv = -1;
  for (const c of cards) { const v = eurOf(c, P, fx) ?? 0; if (v > bv) { bv = v; best = c; } }
  return best || cards[0];
}

function slot(table, pools, out) {
  const e = weighted(table.map(([k, , w]) => [k, w, pools[k]]));
  if (!e) return;
  const row = table.find((x) => x[0] === e[0]);
  out.push({ card: pick(pools[e[0]]), tier: e[0], label: row[1] });
}

export function openPack(prod) {
  const out = [];
  const p = prod.pools;
  const add = (pool, tier, label) => pool?.length && out.push({ card: pick(pool), tier, label });
  if (prod.game === 'onepiece') {
    for (let i = 0; i < 3; i++) add(p.C, 'C', 'Commune');
    add(p.UC.length ? p.UC : p.C, 'UC', 'Peu commune');
    add(p.R, 'R', 'Rare');
    slot(OP_BONUS, p, out);
    slot(OP_HEAD, p, out);
  } else {
    for (let i = 0; i < 3; i++) add(p.C, 'C', 'Commune');
    add(p.U, 'U', 'Peu commune');
    add(p.CUR, 'CUR', 'Reverse');
    slot(PK_BONUS, p, out);
    slot(PK_HEAD, p, out);
  }
  return out;
}
