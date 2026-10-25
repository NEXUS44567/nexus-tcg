import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData, href, cardHref, useNow } from '../lib/hooks.js';
import { useStore, update, energyNow, spendEnergy, ENERGY_MAX, getState, useUniverse } from '../lib/store.js';
import { eurOf, fmtEur, fmtNum, img, GAMES } from '../lib/data.js';
import { buildProducts, openPack, TIER_STYLE } from '../lib/packs.js';
import { CardImage, Icon, Loading, Seg, Modal, GameTag, Empty, Section } from '../components.jsx';

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

export default function BoostersPage() {
  const d = useData();
  const packs = useStore((s) => s.packs);
  const muted = useStore((s) => !!s.muted);
  const now = useNow(1000);
  const game = useUniverse();
  const [current, setCurrent] = useState(null);
  const [odds, setOdds] = useState(null);
  const products = useMemo(() => (d.ready ? buildProducts(d.cats, d.P, d.fx) : []), [d.ready]);
  if (!d.ready) return <div className="page"><Loading /></div>;
  const en = energyNow(packs, now);
  const list = products.filter((p) => p.game === game);
  const virtualValue = Object.entries(packs.virtual).filter(([k]) => k.startsWith(game + ':')).reduce((s, [k]) => { const [g, ...r] = k.split(':'); const c = d.cats[g]?.byId.get(r.join(':')); return s + ((c && eurOf(c, d.P, d.fx)) || 0); }, 0);
  const mm = en.next ? Math.max(0, Math.ceil((en.next - now) / 1000)) : 0;

  if (current) return <Opening prod={current} onClose={() => setCurrent(null)} onAgain={() => { if (spendForPack(current)) setCurrent({ ...current, nonce: Math.random() }); }} />;

  return (
    <div className="page boosters-page">
      <h1 className="page-title">{game === 'onepiece' ? 'Boosters One Piece' : 'Boosters Pokémon'}</h1>
      <p className="lead">Déchire, retourne, collectionne. Des cartes virtuelles, mais la valeur affichée est bien celle du marché aujourd’hui.</p>
      <div className="energy-bar">
        <div className="energy"><Icon name="bolt" size={20} /><b>{en.energy}</b>/{ENERGY_MAX} énergie</div>
        <div className="energy-cells">{Array.from({ length: ENERGY_MAX }, (_, i) => <i key={i} className={i < en.energy ? 'on' : ''} />)}</div>
        <span className="muted">{en.next ? `+1 dans ${Math.floor(mm / 60)} min ${String(mm % 60).padStart(2, '0')} s` : 'Pleine'}</span>
        <button className="icon-btn" onClick={() => update((s) => { s.muted = !s.muted; })} aria-label={muted ? 'Activer le son' : 'Couper le son'}>{muted ? '🔇' : '🔊'}</button>
      </div>
      <div className="pack-stats">
        <div><span>Boosters ouverts</span><b>{fmtNum(packs.opened)}</b></div>
        <div><span>Cartes virtuelles</span><b>{fmtNum(Object.keys(packs.virtual).filter((k) => k.startsWith(game + ':')).length)}</b></div>
        <div><span>Valeur de la collection virtuelle</span><b>{fmtEur(virtualValue)}</b></div>
        {packs.best && <div><span>Meilleur tirage</span><b>{packs.best.name} · {fmtEur(packs.best.eur)}</b></div>}
        <a className="btn ghost" href={href('/boosters/collection')}><Icon name="album" size={18} />Collection virtuelle</a>
      </div>
      <div className="pack-shelf">
        {list.map((p) => (
          <div className="shelf-item" key={p.id}>
            <button className="pack-btn" disabled={en.energy < p.cost} onClick={() => { if (spendForPack(p)) setCurrent({ ...p, nonce: Math.random() }); }} aria-label={'Ouvrir ' + p.name}>
              <PackArt prod={p} />
            </button>
            <div className="shelf-info">
              <b>{p.name}</b>
              <small><GameTag game={p.game} /> {p.kind === 'legend' ? '5 cartes du top 300' : p.code} · {p.cost} énergie{p.cost > 1 ? 's' : ''}</small>
              <button className="link small" onClick={() => setOdds(p)}>Taux et contenu</button>
            </div>
          </div>
        ))}
      </div>
      <Modal open={!!odds} onClose={() => setOdds(null)} title={odds ? 'Taux · ' + odds.name : ''}>
        {odds && <>
          <p>{odds.kind === 'legend' ? '5 cartes tirées parmi les 300 cartes les plus chères du jeu au prix du jour.' : odds.game === 'onepiece' ? '12 cartes : 7 communes, 3 peu communes, 1 rare et 1 emplacement de haute rareté.' : '10 cartes : 4 communes, 3 peu communes, 2 reverses (dont une peut être une illustration rare) et 1 rare ou mieux.'}</p>
          <table className="odds"><tbody>{odds.odds.map(([l, w]) => <tr key={l}><td>{l}</td><td>{w.toLocaleString('fr-FR')} %</td></tr>)}</tbody></table>
          <p className="source-note">Les éditeurs ne publient pas de taux officiels. Ces probabilités sont des estimations NEXUS inspirées des retours de la communauté ; elles ne prédisent pas le contenu d’un vrai booster. Cartes virtuelles, sans valeur monétaire.</p>
        </>}
      </Modal>
    </div>
  );
}

function spendForPack(p) {
  const { energy } = energyNow();
  if (energy < p.cost) return false;
  for (let i = 0; i < p.cost; i++) spendEnergy();
  return true;
}

function Opening({ prod, onClose, onAgain }) {
  const d = useData();
  const pulls = useMemo(() => openPack(prod), [prod.nonce]);
  const [stage, setStage] = useState('pack'); // pack → tearing → reveal → summary
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [newKeys, setNewKeys] = useState(new Set());
  const tearRef = useRef({ x0: null, p: 0 });
  const [tear, setTear] = useState(0);
  const packsState = useStore((s) => s.packs);
  const en = energyNow(packsState);

  useEffect(() => {
    // Enregistre le tirage dans la collection virtuelle dès l'ouverture
    const before = getState().packs.virtual;
    const fresh = new Set(pulls.filter((x) => !before[x.card.key]).map((x) => x.card.key));
    setNewKeys(fresh);
    update((s) => {
      s.packs.opened++;
      for (const x of pulls) s.packs.virtual[x.card.key] = (s.packs.virtual[x.card.key] || 0) + 1;
      const best = pulls.map((x) => ({ x, e: eurOf(x.card, d.P, d.fx) || 0 })).sort((a, b) => b.e - a.e)[0];
      if (best && (!s.packs.best || best.e > s.packs.best.eur)) s.packs.best = { key: best.x.card.key, name: best.x.card.name, eur: best.e };
    });
    setStage('pack'); setIdx(0); setFlipped(false); setTear(0);
  }, [pulls]);

  const doTear = () => { sfx('tear'); vibrate(30); setStage('tearing'); setTimeout(() => setStage('reveal'), 750); };
  const cur = pulls[idx];
  const curTier = cur ? TIER_STYLE[cur.tier] ?? 0 : 0;
  const next = () => {
    if (!flipped) {
      setFlipped(true);
      if (curTier >= 3) { sfx('epic'); vibrate([30, 40, 60]); } else if (curTier >= 2) { sfx('rare'); vibrate(25); } else sfx('flip');
      return;
    }
    if (idx + 1 >= pulls.length) { setStage('summary'); return; }
    setIdx(idx + 1); setFlipped(false);
  };
  useEffect(() => {
    const f = (e) => { if (stage === 'reveal' && (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight')) { e.preventDefault(); next(); } if (stage === 'pack' && e.key === 'Enter') doTear(); };
    window.addEventListener('keydown', f); return () => window.removeEventListener('keydown', f);
  });

  const values = pulls.map((x) => eurOf(x.card, d.P, d.fx));
  const total = values.reduce((s, v) => s + (v || 0), 0);

  return (
    <div className={'opening ' + prod.game + ' stage-' + stage + ' tier-' + (stage === 'reveal' && flipped ? curTier : 0)}>
      <div className="op-bg" aria-hidden="true" />
      <header className="op-head">
        <button className="btn ghost" onClick={onClose}>‹ Boosters</button>
        <span>{prod.name}</span>
        {stage === 'reveal' && <button className="btn ghost" onClick={() => setStage('summary')}>Tout révéler</button>}
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

      {stage === 'reveal' && cur && (
        <div className="op-reveal" onClick={next}>
          <div className="op-count">{idx + 1} / {pulls.length}</div>
          <div className="op-stack">
            {pulls.slice(idx + 1, idx + 4).map((x, i) => <div key={idx + 1 + i} className="op-back stacked" style={{ '--i': i + 1 }}><CardBack /></div>)}
            <FlipCard key={idx} pull={cur} flipped={flipped} tier={curTier} isNew={newKeys.has(cur.card.key)} eur={values[idx]} />
          </div>
          <p className="op-hint">{flipped ? (idx + 1 >= pulls.length ? 'Touche pour voir le résumé' : 'Touche pour la carte suivante') : curTier >= 3 ? 'Quelque chose brille… touche pour retourner' : 'Touche pour retourner'}</p>
        </div>
      )}

      {stage === 'summary' && (
        <div className="op-summary">
          <div className="sum-head">
            <span className="kicker">Valeur du tirage au prix du jour</span>
            <b className="sum-total">{fmtEur(total)}</b>
            <span>{newKeys.size} nouvelle{newKeys.size > 1 ? 's' : ''} carte{newKeys.size > 1 ? 's' : ''} pour ta collection virtuelle</span>
          </div>
          <div className="sum-grid">
            {pulls.map((x, i) => ({ x, v: values[i], i })).sort((a, b) => (b.v || 0) - (a.v || 0)).map(({ x, v, i }) => (
              <a key={i} className={'sum-card t' + (TIER_STYLE[x.tier] ?? 0)} href={cardHref(x.card)}>
                <CardImage card={x.card} />
                {newKeys.has(x.card.key) && <span className="new">Nouvelle</span>}
                <span className="sc-name">{x.card.name}</span>
                <span className="sc-val">{v != null ? fmtEur(v) : '—'}</span>
              </a>
            ))}
          </div>
          <div className="row center">
            <button className="btn primary big" disabled={en.energy < prod.cost} onClick={onAgain}><Icon name="pack" size={20} />Rouvrir ({prod.cost} énergie{prod.cost > 1 ? 's' : ''}, reste {en.energy})</button>
            <a className="btn ghost" href={href('/boosters/collection')}>Collection virtuelle</a>
            <button className="btn ghost" onClick={onClose}>Changer de booster</button>
          </div>
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

// ---- Collection virtuelle ----
export function VirtualCollection() {
  const d = useData();
  const virtual = useStore((s) => s.packs.virtual);
  const game = useUniverse();
  const [setCode, setSetCode] = useState(null);
  const [filter, setFilter] = useState('all');
  const products = useMemo(() => (d.ready ? buildProducts(d.cats, d.P, d.fx) : []), [d.ready]);
  if (!d.ready) return <div className="page"><Loading /></div>;
  const sets = products.filter((p) => p.kind === 'booster' && p.game === game).map((p) => p.set);
  const code = setCode && sets.find((s) => s.code === setCode) ? setCode : sets[0]?.code;
  const cards = d.cats[game].cards.filter((c) => c.set === code);
  const have = cards.filter((c) => virtual[c.key]);
  const shown = cards.filter((c) => filter === 'all' || (filter === 'have' ? virtual[c.key] : !virtual[c.key]));
  const legend = Object.keys(virtual).filter((k) => k.startsWith(game + ':')).map((k) => d.cats[game].byId.get(k.split(':').slice(1).join(':'))).filter((c) => c && !sets.some((s) => s.code === c.set));
  return (
    <div className="page">
      <nav className="crumbs"><a href={href('/boosters')}>Boosters</a></nav>
      <h1 className="page-title">Collection virtuelle</h1>
      <div className="toolbar">
        <select value={code || ''} onChange={(e) => setSetCode(e.target.value)} aria-label="Extension">{sets.map((s) => <option key={s.code} value={s.code}>{s.name} ({s.code})</option>)}</select>
        <Seg value={filter} onChange={setFilter} label="Filtre" options={[['all', 'Toutes'], ['have', 'Obtenues'], ['missing', 'À découvrir']]} />
      </div>
      <div className="vc-progress"><div className="progress big"><i style={{ width: (have.length / Math.max(1, cards.length)) * 100 + '%' }} /></div><b>{have.length} / {cards.length}</b><span className="muted">{Math.round((have.length / Math.max(1, cards.length)) * 100)} % de l’extension</span></div>
      <div className="grid tiles vc">
        {shown.map((c) => virtual[c.key] ? (
          <a key={c.key} className="tile" href={cardHref(c)}><div className="tile-img"><CardImage card={c} />{virtual[c.key] > 1 && <span className="qty">×{virtual[c.key]}</span>}</div><div className="tile-body"><div className="tile-name">{c.name}</div><div className="tile-meta">{c.number}{c.variant ? ' · ' + c.variant : ''}</div></div></a>
        ) : (
          <div key={c.key} className="tile missing"><div className="tile-img"><CardImage card={c} /><span className="q">?</span></div><div className="tile-body"><div className="tile-name">À découvrir</div><div className="tile-meta">{c.number} · {c.rarity}</div></div></div>
        ))}
      </div>
      {legend.length > 0 && <Section kicker="Boosters Légende" title="Tes cartes légendaires"><div className="grid tiles">{legend.map((c) => <a key={c.key} className="tile" href={cardHref(c)}><div className="tile-img"><CardImage card={c} /></div><div className="tile-body"><div className="tile-name">{c.name}</div><div className="tile-meta">{c.number}</div></div></a>)}</div></Section>}
    </div>
  );
}
