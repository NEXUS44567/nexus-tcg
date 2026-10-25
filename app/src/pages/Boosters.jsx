import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData, href, cardHref, useNow } from '../lib/hooks.js';
import { useStore, update, getState, useUniverse, claimDaily, spendCoins } from '../lib/store.js';
import { eurOf, fmtEur, fmtNum, img, GAMES } from '../lib/data.js';
import { buildProduct, openPack, TIER_STYLE, PRICE, CURRENCY } from '../lib/packs.js';
import { CardImage, Icon, Loading, Seg, Modal, GameTag, Empty, Section, Price } from '../components.jsx';

// ---- Petits sons synthétisés (aucun fichier) ----
let ctx;
function sfx(kind) {
  if (getState().muted) return;
  try {
    ctx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t = ctx.currentTime;
    if (kind === 'tear') {
      const len = 0.35, buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
      const s = ctx.createBufferSource(); s.buffer = buf; const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800;
      const g = ctx.createGain(); g.gain.value = 0.35; s.connect(f).connect(g).connect(ctx.destination); s.start(t);
    } else {
      const notes = kind === 'flip' ? [520] : kind === 'rare' ? [660, 880, 1320] : [440, 660, 990, 1320, 1760];
      notes.forEach((fr, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.type = kind === 'flip' ? 'triangle' : 'sine'; o.frequency.value = fr;
        const st = t + i * 0.07; g.gain.setValueAtTime(0, st); g.gain.linearRampToValueAtTime(kind === 'flip' ? 0.08 : 0.12, st + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, st + (kind === 'flip' ? 0.12 : 0.6));
        o.connect(g).connect(ctx.destination); o.start(st); o.stop(st + 0.7);
      });
    }
  } catch {}
}
const vibrate = (p) => { try { navigator.vibrate?.(p); } catch {} };

function PackArt({ prod, small, torn }) {
  const g = GAMES[prod.game];
  return (
    <div className={'pack-art ' + prod.game + ' ' + prod.kind + (small ? ' small' : '') + (torn ? ' torn' : '')} style={{ '--accent': g.accent }}>
      <div className="pack-top"><span>{prod.kind === 'legend' ? '★ ★ ★' : 'NEXUS'}</span></div>
      <div className="pack-body">
        <div className="pack-brand">{g.label}</div>
        <div className="pack-window">{prod.cover && <img src={img(prod.cover.image, 'small')} alt="" referrerPolicy="no-referrer" draggable="false" />}</div>
        <div className="pack-name">{prod.name}</div>
        <div className="pack-sub">{prod.code} · {prod.size} cartes</div>
      </div>
      <span className="pack-foil" />
    </div>
  );
}

export default function BoostersPage({ focus }) {
  const d = useData();
  const game = useUniverse();
  const cur = CURRENCY[game];
  const wallet = useStore((s) => s.wallet?.[game]);
  const muted = useStore((s) => !!s.muted);
  const [opening, setOpening] = useState(null);
  const [odds, setOdds] = useState(false);
  const [gain, setGain] = useState(0);
  const prod = useMemo(() => (d.ready ? buildProduct(game, d.cats, d.P, d.fx) : null), [d.ready, game]);
  useEffect(() => { const g = claimDaily(game, PRICE.start, PRICE.daily); if (g) setGain(g); }, [game]);
  useEffect(() => { if (focus && prod) setTimeout(() => document.getElementById('collection-virtuelle')?.scrollIntoView({ behavior: 'smooth' }), 200); }, [focus, !!prod]);
  if (!d.ready || !prod) return <div className="page"><Loading /></div>;
  const coins = wallet?.coins ?? PRICE.start;
  const buy = (n) => {
    const cost = n === 1 ? PRICE.booster : PRICE.display;
    if (!spendCoins(game, cost)) return;
    setOpening({ n: n === 1 ? 1 : PRICE.displayPacks, nonce: Math.random() });
  };
  if (opening) return <Opening prod={prod} count={opening.n} nonce={opening.nonce} onClose={() => setOpening(null)} onAgain={(n) => buy(n)} coins={coins} />;
  const missing = (cost) => Math.max(0, cost - coins);
  return (
    <div className="page boosters-page">
      <div className="kicker">{GAMES[game].label} · boosters virtuels</div>
      <h1 className="page-title">Booster {prod.name}</h1>
      <p className="lead">Déchire un booster de la dernière extension. Chaque carte obtenue est cochée « Obtenue » dans ta collection virtuelle, juste en dessous ; les autres restent « À découvrir ».</p>

      <div className={'wallet ' + game}>
        <span className="coin" aria-hidden="true">{cur.sym}</span>
        <div><b>{fmtNum(coins)}</b><span>{cur.name}</span></div>
        <a className="btn small ghost" href={href('/boutique')}><Icon name="plus" size={16} />Obtenir des {cur.name}</a>
        <button className="icon-btn" onClick={() => update((s) => { s.muted = !s.muted; })} aria-label={muted ? 'Activer le son' : 'Couper le son'}>{muted ? '🔇' : '🔊'}</button>
        <small>Booster : {PRICE.booster} {cur.name} · Display : {fmtNum(PRICE.display)} pour {PRICE.displayPacks} boosters · +{PRICE.daily} {cur.name} chaque jour, même les jours où tu ne viens pas. Monnaie virtuelle, sans valeur réelle.</small>
        {gain > 0 && <span className="gain">+{fmtNum(gain)} {cur.name} reçus depuis ta dernière visite</span>}
      </div>

      <div className="pack-stage">
        <button className="pack-btn big" disabled={coins < PRICE.booster} onClick={() => buy(1)} aria-label={'Ouvrir un booster ' + prod.name}><PackArt prod={prod} /></button>
        <div className="pack-offers">
          <button className="offer primary" disabled={coins < PRICE.booster} onClick={() => buy(1)}>
            <b>Ouvrir un booster</b><span>{PRICE.booster} {cur.name}</span>{coins < PRICE.booster && <small>Il te manque {fmtNum(missing(PRICE.booster))}</small>}
          </button>
          <button className="offer display" disabled={coins < PRICE.display} onClick={() => buy(12)}>
            <span className="tag-off">10 + 2 OFFERTS</span>
            <b>Display · {PRICE.displayPacks} boosters</b><span>{fmtNum(PRICE.display)} {cur.name}</span>{coins < PRICE.display && <small>Il te manque {fmtNum(missing(PRICE.display))}</small>}
          </button>
          <p className="muted small">{prod.size} cartes : {prod.composition} <button className="link small" onClick={() => setOdds(true)}>Voir les taux</button></p>
          <div className="pack-stats">
            <div><span>Aujourd’hui</span><b>{fmtNum(wallet?.openedToday || 0)}</b></div>
            <div><span>Au total</span><b>{fmtNum(wallet?.opened || 0)}</b></div>
            {wallet?.best && <a href={href('/carte/' + encodeURIComponent(wallet.best.key))}><span>Meilleur tirage</span><b>{wallet.best.name} · {fmtEur(wallet.best.eur)}</b></a>}
          </div>
        </div>
      </div>

      <VirtualSet prod={prod} />

      <Modal open={odds} onClose={() => setOdds(false)} title={'Taux · ' + prod.name}>
        <p>{prod.size} cartes : {prod.composition}</p>
        {prod.odds.map(([title, rows]) => {
          const tot = rows.reduce((s, r) => s + r[2], 0);
          return <React.Fragment key={title}><h4>{title}</h4><table className="odds"><tbody>{rows.map(([k, l, w]) => <tr key={k}><td>{l}</td><td>{(Math.round((w / tot) * 1000) / 10).toLocaleString('fr-FR')} %</td></tr>)}</tbody></table></React.Fragment>;
        })}
        <p className="source-note">Les éditeurs ne publient pas de taux officiels. Ces probabilités sont des estimations NEXUS inspirées des retours de la communauté ; elles ne prédisent pas le contenu d’un vrai booster. Cartes virtuelles, sans valeur monétaire.</p>
      </Modal>
    </div>
  );
}

function VirtualSet({ prod }) {
  const d = useData();
  const virtual = useStore((s) => s.packs.virtual);
  const [filter, setFilter] = useState('all');
  const cards = prod.cards;
  const have = cards.filter((c) => virtual[c.key]);
  const value = have.reduce((s, c) => s + (eurOf(c, d.P, d.fx) || 0), 0);
  const shown = cards.filter((c) => filter === 'all' || (filter === 'have' ? virtual[c.key] : !virtual[c.key]));
  return (
    <section className="section" id="collection-virtuelle">
      <header className="section-head">
        <div><div className="kicker">Collection virtuelle</div><h2>{prod.name}</h2></div>
        <Seg value={filter} onChange={setFilter} label="Filtre" options={[['all', 'Toutes'], ['have', 'Obtenues'], ['missing', 'À découvrir']]} />
      </header>
      <div className="vc-progress"><div className="progress big"><i style={{ width: (have.length / Math.max(1, cards.length)) * 100 + '%' }} /></div><b>{have.length} / {cards.length}</b><span className="muted">cartes obtenues{prod.game === 'onepiece' ? ' (parallèles comprises)' : ''} · {Math.round((have.length / Math.max(1, cards.length)) * 100)} % · valeur {fmtEur(value)}</span></div>
      <div className="grid tiles vc">
        {shown.map((c) => virtual[c.key] ? (
          <a key={c.key} className="tile got" href={cardHref(c)}><div className="tile-img"><CardImage card={c} />{virtual[c.key] > 1 && <span className="qty">×{virtual[c.key]}</span>}<span className="got-badge">Obtenue</span></div><div className="tile-body"><div className="tile-name">{c.name}</div><div className="tile-meta">{c.number} · {c.rarity}{c.variant ? ' · ' + c.variant.toLowerCase() : ''}</div><div className="tile-price"><Price card={c} /></div></div></a>
        ) : (
          <div key={c.key} className="tile missing"><div className="tile-img"><CardImage card={c} /><span className="q">?</span><span className="miss-badge">À découvrir</span></div><div className="tile-body"><div className="tile-name">{c.name}</div><div className="tile-meta">{c.number} · {c.rarity}{c.variant ? ' · ' + c.variant.toLowerCase() : ''}</div></div></div>
        ))}
      </div>
      <p className="source-note">Cartes virtuelles : aucune carte physique, aucune valeur monétaire. La valeur affichée est celle des vraies cartes au prix du jour.</p>
    </section>
  );
}

// ---- Boutique de Berrys et de Pokéballs ----
const BUNDLES = [['Bourse', 1000, 0, '1,99 €'], ['Sacoche', 2750, 250, '4,99 €'], ['Coffre', 6000, 1000, '9,99 €', 'POPULAIRE'], ['Trésor', 13000, 3000, '19,99 €'], ['Trésor légendaire', 35000, 10000, '49,99 €', 'MEILLEURE OFFRE']];
export function ShopPage() {
  const game = useUniverse();
  const cur = CURRENCY[game];
  const coins = useStore((s) => s.wallet?.[game]?.coins ?? PRICE.start);
  useEffect(() => { claimDaily(game, PRICE.start, PRICE.daily); }, [game]);
  return (
    <div className="page shop-page">
      <nav className="crumbs"><a href={href('/boosters')}>Boosters</a></nav>
      <h1 className="page-title">Boutique · {cur.name}</h1>
      <p className="lead">Des {cur.name} pour ouvrir des boosters {GAMES[game].label}.</p>
      <div className={'wallet ' + game}><span className="coin" aria-hidden="true">{cur.sym}</span><div><b>{fmtNum(coins)}</b><span>{cur.name}</span></div><a className="btn small primary" href={href('/boosters')}>Ouvrir des boosters</a></div>
      <p className="warn-note"><Icon name="bell" size={16} />Prix indicatifs. Le paiement n’est pas encore en place : aucun achat n’est possible pour le moment et aucune donnée bancaire n’est demandée. En attendant, tu reçois {PRICE.daily} {cur.name} chaque jour.</p>
      <div className="bundles">
        {BUNDLES.map(([name, amount, bonus, price, flag]) => (
          <div key={name} className={'bundle ' + game + (flag ? ' flag' : '')}>
            {flag && <span className="bundle-flag">{flag}</span>}
            <span className="coin big" aria-hidden="true">{cur.sym}</span>
            <h3>{name}</h3>
            <b>{fmtNum(amount)} {cur.name}</b>
            <small>{bonus ? `dont +${fmtNum(bonus)} offerts` : ' '}</small>
            <span className="muted small">≈ {Math.floor(amount / PRICE.booster)} boosters{amount >= PRICE.display ? ` ou ${Math.floor(amount / PRICE.display)} display${amount >= PRICE.display * 2 ? 's' : ''}` : ''}</span>
            <span className="bundle-price">{price}</span>
            <button className="btn ghost" disabled>Bientôt</button>
          </div>
        ))}
      </div>
      <div className="faq-grid">
        <div><h3>Repères</h3><p>1 booster {GAMES[game].label} = {PRICE.booster} {cur.name} ; 1 display ({PRICE.displayPacks} boosters, 10 + 2 offerts) = {fmtNum(PRICE.display)} {cur.name}.</p></div>
        <div><h3>Une monnaie par univers</h3><p>Les {cur.name} ne servent qu’aux boosters {GAMES[game].label}.</p></div>
        <div><h3>Virtuel</h3><p>Monnaies et cartes virtuelles : aucune valeur réelle, aucune carte physique.</p></div>
      </div>
    </div>
  );
}

function Opening({ prod, count, nonce, onClose, onAgain, coins }) {
  const d = useData();
  const game = prod.game;
  const cur = CURRENCY[game];
  const packs = useMemo(() => Array.from({ length: count }, () => openPack(prod)), [nonce]);
  const [pi, setPi] = useState(0); // booster en cours (display)
  const pulls = packs[pi];
  const [stage, setStage] = useState('pack'); // pack → tearing → reveal → summary
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newKeys, setNewKeys] = useState(new Set());
  const tearRef = useRef({ x0: null, p: 0 });
  const [tear, setTear] = useState(0);
  const wallet = useStore((s) => s.wallet?.[game]);

  useEffect(() => {
    // Enregistre tout le tirage dans la collection virtuelle dès l'ouverture
    const before = getState().packs.virtual;
    const all = packs.flat();
    setNewKeys(new Set(all.filter((x) => !before[x.card.key]).map((x) => x.card.key)));
    update((s) => {
      const w = s.wallet[game];
      w.opened = (w.opened || 0) + packs.length; w.openedToday = (w.openedToday || 0) + packs.length;
      for (const x of all) s.packs.virtual[x.card.key] = (s.packs.virtual[x.card.key] || 0) + 1;
      const best = all.map((x) => ({ x, e: eurOf(x.card, d.P, d.fx) || 0 })).sort((a, b) => b.e - a.e)[0];
      if (best && (!w.best || best.e > w.best.eur)) w.best = { key: best.x.card.key, name: best.x.card.name, eur: best.e };
    });
    setPi(0); setStage('pack'); setIdx(0); setFlipped(false); setTear(0);
  }, [packs]);

  const doTear = () => { sfx('tear'); vibrate(30); setStage('tearing'); setTimeout(() => setStage('reveal'), 750); };
  const curP = pulls?.[idx];
  const curTier = curP ? TIER_STYLE[curP.tier] ?? 0 : 0;
  const nextPack = () => { if (pi + 1 < packs.length) { setPi(pi + 1); setIdx(0); setFlipped(false); setTear(0); setStage('pack'); } else setStage('summary'); };
  const next = () => {
    if (!flipped) {
      setFlipped(true);
      if (curTier >= 3) { sfx('epic'); vibrate([30, 40, 60]); } else if (curTier >= 2) { sfx('rare'); vibrate(25); } else sfx('flip');
      return;
    }
    if (idx + 1 >= pulls.length) { setStage(packs.length > 1 && pi + 1 < packs.length ? 'between' : 'summary'); return; }
    setIdx(idx + 1); setFlipped(false);
  };
  useEffect(() => {
    const f = (e) => { if (stage === 'reveal' && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); next(); } if (stage === 'pack' && e.key === 'Enter') doTear(); };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  });

  const values = pulls.map((x) => eurOf(x.card, d.P, d.fx));
  const all = (stage === 'summary' ? packs.flat() : pulls).map((x) => ({ x, v: eurOf(x.card, d.P, d.fx) }));
  const total = all.reduce((s, y) => s + (y.v || 0), 0);
  const newCount = new Set(all.filter((y) => newKeys.has(y.x.card.key)).map((y) => y.x.card.key)).size;
  const left = wallet?.coins ?? coins;

  return (
    <div className={'opening ' + game + ' stage-' + stage + ' tier-' + (stage === 'reveal' && flipped ? curTier : 0)}>
      <div className="op-bg" aria-hidden="true" />
      <header className="op-head">
        <button className="btn ghost" onClick={onClose}>‹ Boosters</button>
        <span>{prod.name}{packs.length > 1 ? ` · booster ${pi + 1}/${packs.length}` : ''}</span>
        {(stage === 'reveal' || stage === 'between' || stage === 'pack') && <button className="btn ghost" onClick={() => setStage('summary')}>Tout révéler</button>}
      </header>

      {(stage === 'pack' || stage === 'tearing') && (
        <div className="op-pack-zone">
          <div className={'op-pack' + (stage === 'tearing' ? ' tearing' : '')} style={{ '--tear': tear }}
            onPointerDown={(e) => { tearRef.current = { x0: e.clientX, p: 0 }; e.currentTarget.setPointerCapture(e.pointerId); }}
            onPointerMove={(e) => { if (tearRef.current.x0 == null || stage !== 'pack') return; const p = Math.min(1, Math.abs(e.clientX - tearRef.current.x0) / 180); tearRef.current.p = p; setTear(p); if (p >= 1) { tearRef.current.x0 = null; doTear(); } }}
            onPointerUp={() => { if (tearRef.current.p < 0.15 && stage === 'pack') doTear(); tearRef.current.x0 = null; setTear(0); }}>
            <PackArt prod={prod} torn={stage === 'tearing'} />
            <div className="tear-line" style={{ width: tear * 100 + '%' }} />
          </div>
          <p className="op-hint">{stage === 'pack' ? 'Glisse ton doigt sur le haut du paquet pour le déchirer, ou touche-le' : 'Ça s’ouvre…'}</p>
        </div>
      )}

      {stage === 'reveal' && curP && (
        <div className="op-reveal" onClick={next}>
          <div className="op-count">{idx + 1} / {pulls.length}</div>
          <div className="op-stack">
            {pulls.slice(idx + 1, idx + 4).map((x, i) => <div key={idx + 1 + i} className="op-back stacked" style={{ '--i': i + 1 }}><CardBack /></div>)}
            <FlipCard key={pi + '-' + idx} pull={curP} flipped={flipped} tier={curTier} isNew={newKeys.has(curP.card.key)} eur={values[idx]} />
          </div>
          <p className="op-hint">{flipped ? (idx + 1 >= pulls.length ? 'Touche pour continuer' : 'Touche pour la carte suivante') : curTier >= 3 ? 'Quelque chose brille… touche pour retourner' : 'Touche pour retourner'}</p>
        </div>
      )}

      {stage === 'between' && (
        <div className="op-summary">
          <div className="sum-head"><span className="kicker">Booster {pi + 1} sur {packs.length}</span><b className="sum-total">{fmtEur(total)}</b></div>
          <div className="sum-grid">{all.sort((a, b) => (b.v || 0) - (a.v || 0)).map(({ x, v }, i) => <a key={i} className={'sum-card t' + (TIER_STYLE[x.tier] ?? 0)} href={cardHref(x.card)}><CardImage card={x.card} />{newKeys.has(x.card.key) && <span className="new">Nouvelle</span>}<span className="sc-name">{x.card.name}</span><span className="sc-val">{v != null ? fmtEur(v) : '—'}</span></a>)}</div>
          <div className="row center"><button className="btn primary big" onClick={nextPack}><Icon name="pack" size={20} />Booster suivant ({pi + 2}/{packs.length})</button><button className="btn ghost" onClick={() => setStage('summary')}>Tout révéler</button></div>
        </div>
      )}

      {stage === 'summary' && (
        <div className="op-summary">
          <div className="sum-head">
            <span className="kicker">{packs.length > 1 ? `Display de ${packs.length} boosters` : 'Ton booster'} · valeur au prix du jour</span>
            <b className="sum-total">{fmtEur(total)}</b>
            <span>{newCount} nouvelle{newCount > 1 ? 's' : ''} carte{newCount > 1 ? 's' : ''} pour ta collection virtuelle</span>
          </div>
          <div className="sum-grid">
            {all.sort((a, b) => (b.v || 0) - (a.v || 0)).slice(0, packs.length > 1 ? 36 : 12).map(({ x, v }, i) => (
              <a key={i} className={'sum-card t' + (TIER_STYLE[x.tier] ?? 0)} href={cardHref(x.card)}>
                <CardImage card={x.card} />
                {newKeys.has(x.card.key) && <span className="new">Nouvelle</span>}
                <span className="sc-name">{x.card.name}</span>
                <span className="sc-val">{v != null ? fmtEur(v) : '—'}</span>
              </a>
            ))}
          </div>
          {packs.length > 1 && all.length > 36 && <p className="muted center">Les 36 meilleures cartes sur {all.length} sont affichées ; toutes sont dans ta collection virtuelle.</p>}
          <div className="row center">
            <button className="btn primary big" disabled={left < PRICE.booster} onClick={() => onAgain(1)}><Icon name="pack" size={20} />Rouvrir · {PRICE.booster} {cur.name}</button>
            <button className="btn ghost" disabled={left < PRICE.display} onClick={() => onAgain(12)}>Display · {fmtNum(PRICE.display)}</button>
            <button className="btn ghost" onClick={onClose}>Voir ma collection virtuelle</button>
          </div>
          <p className="muted center">Il te reste {fmtNum(left)} {cur.name}.</p>
          <p className="source-note">Cartes virtuelles, sans valeur monétaire. Taux estimés, non officiels.</p>
        </div>
      )}
    </div>
  );
}

function CardBack() {
  return <div className="card-back"><div className="cb-inner"><span>NEXUS</span><small>TCG</small></div></div>;
}

function FlipCard({ pull, flipped, tier, isNew, eur }) {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const move = (e) => { const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%'); el.style.setProperty('--rx', (0.5 - y) * 14 + 'deg'); el.style.setProperty('--ry', (x - 0.5) * 18 + 'deg'); };
    const orient = (e) => { if (e.gamma == null) return; el.style.setProperty('--ry', Math.max(-18, Math.min(18, e.gamma / 2)) + 'deg'); el.style.setProperty('--rx', Math.max(-14, Math.min(14, (e.beta - 45) / 3)) + 'deg'); el.style.setProperty('--mx', 50 + e.gamma + '%'); };
    el.addEventListener('pointermove', move); window.addEventListener('deviceorientation', orient);
    return () => { el.removeEventListener('pointermove', move); window.removeEventListener('deviceorientation', orient); };
  }, []);
  return (
    <div className={'flip t' + tier + (flipped ? ' flipped' : '')} ref={ref}>
      <div className="flip-inner">
        <div className="flip-face back"><CardBack />{tier >= 3 && <span className="aura" />}</div>
        <div className="flip-face front">
          <CardImage card={pull.card} size="large" eager />
          {tier >= 2 && <span className="holo" />}
        </div>
      </div>
      {flipped && (
        <div className="flip-info">
          <span className={'rar t' + tier}>{pull.label}</span>
          {isNew && <span className="new">Nouvelle</span>}
          <b>{pull.card.name}</b>
          <span className="fv">{eur != null ? fmtEur(eur) : 'Pas de prix relevé'}</span>
        </div>
      )}
      {flipped && tier >= 3 && <div className="burst" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ '--a': i * 20 + 'deg', '--d': 80 + (i % 3) * 30 + 'px' }} />)}</div>}
    </div>
  );
}

// ---- Collection virtuelle : même page que le booster ----
export function VirtualCollection() {
  return <BoostersPage focus />;
}
