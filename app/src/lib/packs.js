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

export function buildProducts(cats, P, fx) {
  const out = [];
  const op = cats.onepiece;
  const opSets = op.setList.filter((s) => /Booster|Extra/.test(s.series)).slice(0, 4);
  for (const s of opSets) {
    const cards = op.cards.filter((c) => c.set === s.code);
    const pools = onePiecePools(cards);
    if (pools.C.length < 7 || pools.R.length < 1) continue;
    out.push({ id: 'op-' + s.code, game: 'onepiece', set: s, name: s.name, code: s.code, size: 12, cost: 1, cover: topCard(cards, P, fx), pools, kind: 'booster',
      odds: OP_HIT.filter(([k]) => pools[k].length).map(([k, l, w]) => [l, w]) });
  }
  const pk = cats.pokemon;
  const pkSets = pk.setList.filter((s) => s.count >= 80).filter((s) => { const p = pokemonPools(pk.cards.filter((c) => c.set === s.code)); return p.C.length >= 4 && p.U.length >= 3 && p.R.length; }).slice(0, 4);
  for (const s of pkSets) {
    const cards = pk.cards.filter((c) => c.set === s.code);
    const pools = pokemonPools(cards);
    out.push({ id: 'pk-' + s.code, game: 'pokemon', set: s, name: s.name, code: s.code, size: 10, cost: 1, cover: topCard(cards, P, fx), pools, kind: 'booster', logo: s.logo,
      odds: [...PK_RARE.filter(([k]) => pools[k].length).map(([k, l, w]) => [l, w]), ...PK_REV.slice(1).filter(([k]) => pools[k].length).map(([k, l, w]) => [l + ' (emplacement reverse)', w])] });
  }
  // Boosters Légende : 5 cartes tirées parmi les 300 plus chères du jeu
  for (const g of ['onepiece', 'pokemon']) {
    const priced = cats[g].cards.map((c) => [eurOf(c, P, fx), c]).filter((x) => x[0] != null && !(g === 'pokemon' && P.pokemon.items[x[1].id]?.[6] === 'x')).sort((a, b) => b[0] - a[0]).slice(0, 300);
    if (priced.length < 50) continue;
    out.push({ id: 'leg-' + g, game: g, name: 'Légende ' + (g === 'onepiece' ? 'One Piece' : 'Pokémon'), code: 'LÉGENDE', size: 5, cost: 3, kind: 'legend', cover: priced[0][1], pool: priced,
      odds: [['Une carte du top 10', 2], ['Du top 11 au top 50', 18], ['Du top 51 au top 300', 80]] });
  }
  return out;
}

function topCard(cards, P, fx) {
  let best = null, bv = -1;
  for (const c of cards) { const v = eurOf(c, P, fx) ?? 0; if (v > bv) { bv = v; best = c; } }
  return best || cards[0];
}

export function openPack(prod) {
  const out = [];
  const add = (c, tier, label) => out.push({ card: c, tier, label });
  if (prod.kind === 'legend') {
    const top = prod.pool;
    for (let i = 0; i < prod.size; i++) {
      const r = Math.random() * 100;
      const range = r < 2 ? top.slice(0, 10) : r < 20 ? top.slice(10, 50) : top.slice(50);
      const [, c] = pick(range.length ? range : top);
      add(c, 'LEG', 'Légende');
    }
    return out;
  }
  const p = prod.pools;
  if (prod.game === 'onepiece') {
    for (let i = 0; i < 7; i++) add(pick(p.C), 'C', 'Commune');
    for (let i = 0; i < 3; i++) add(pick(p.UC.length ? p.UC : p.C), 'UC', 'Peu commune');
    add(pick(p.R), 'R', 'Rare');
    const [k] = weighted(OP_HIT.map(([key, , w]) => [key, w, p[key]])) || ['R'];
    const hit = OP_HIT.find((x) => x[0] === k);
    add(pick(p[k]), k, hit?.[1] || 'Rare');
  } else {
    for (let i = 0; i < 4; i++) add(pick(p.C), 'C', 'Commune');
    for (let i = 0; i < 3; i++) add(pick(p.U), 'U', 'Peu commune');
    add(pick(p.CUR), 'CUR', 'Reverse');
    const rev = weighted(PK_REV.map(([k, l, w]) => [k, w, p[k]]));
    add(pick(p[rev[0]]), rev[0], PK_REV.find((x) => x[0] === rev[0])[1]);
    const rare = weighted(PK_RARE.map(([k, l, w]) => [k, w, p[k]]));
    add(pick(p[rare[0]]), rare[0], PK_RARE.find((x) => x[0] === rare[0])[1]);
  }
  return out;
}
