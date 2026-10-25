import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useData, href, cardHref } from '../lib/hooks.js';
import { useStore, update, getState, useUniverse, claimDaily, spendCoins } from '../lib/store.js';
import { fmtNum, img, GAMES } from '../lib/data.js';
import { buildProduct, openPack, TIER_STYLE, PRICE, CURRENCY } from '../lib/packs.js';
import { League } from './League.jsx';
import { seasonNow } from '../lib/league.js';
import { CardImage, Icon, Loading, Seg, Modal, PirateEmblem, EnergyEmblem } from '../components.jsx';

// Animations reprises de la V1 : booster qui flotte et brille, languette à déchirer, Haki (One Piece)
// ou foudre (Pokémon) à l'ouverture, carte qui se charge avant une rare, retournement, bannière,
// confettis selon la rareté, bande des cartes déjà révélées.

// ---- Sons (V1) ----
let actx = null;
const soundOn = () => !getState().muted;
function ac() { if (!soundOn()) return null; try { actx ??= new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; } catch { return null; } }
function tone(f, at, dur, type = 'triangle', vol = 0.12) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, c.currentTime + at); g.gain.linearRampToValueAtTime(vol, c.currentTime + at + 0.01); g.gain.exponentialRampToValueAtTime(1e-4, c.currentTime + at + dur);
  o.connect(g).connect(c.destination); o.start(c.currentTime + at); o.stop(c.currentTime + at + dur + 0.05);
}
export const SFX = {
  tear() { const c = ac(); if (!c) return; const n = Math.floor(c.sampleRate * 0.45), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = 'bandpass'; f.frequency.setValueAtTime(900, c.currentTime); f.frequency.linearRampToValueAtTime(3800, c.currentTime + 0.4); g.gain.value = 0.35; s.connect(f).connect(g).connect(c.destination); s.start(); },
  haki() { const c = ac(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(90, c.currentTime); o.frequency.exponentialRampToValueAtTime(38, c.currentTime + 0.8); g.gain.setValueAtTime(1e-4, c.currentTime); g.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 0.05); g.gain.exponentialRampToValueAtTime(1e-4, c.currentTime + 0.9); const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 400; o.connect(f).connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 1); },
  thunder() { const c = ac(); if (!c) return; for (let k = 0; k < 3; k++) { const n = Math.floor(c.sampleRate * 0.18), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 3 * (Math.random() < 0.3 ? 1 : 0.3); const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = 1800; g.gain.value = 0.3; s.connect(f).connect(g).connect(c.destination); s.start(c.currentTime + k * 0.12); } },
  flip() { tone(1250, 0, 0.05, 'square', 0.04); tone(620, 0.02, 0.08, 'triangle', 0.06); },
  charge() { const c = ac(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220, c.currentTime); o.frequency.exponentialRampToValueAtTime(880, c.currentTime + 0.8); g.gain.setValueAtTime(1e-4, c.currentTime); g.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 0.6); g.gain.exponentialRampToValueAtTime(1e-4, c.currentTime + 0.85); o.connect(g).connect(c.destination); o.start(); o.stop(c.currentTime + 0.9); },
  rare(lv) { const n = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093]; for (let i = 0; i < Math.min(n.length, 2 + lv); i++) tone(n[i], i * 0.07, 0.5, 'triangle', 0.1); if (lv >= 3) tone(2093, 0.5, 0.9, 'sine', 0.06); },
};
export const vibrate = (p) => { try { navigator.vibrate?.(p); } catch {} };

// ---- Confettis selon la rareté (V1) ----
const PALETTE = { 1: ['#7cc4ff', '#ffffff'], 2: ['#b48bff', '#7cc4ff', '#ffffff'], 3: ['#ffd76a', '#fff3c2', '#ffb347'], 4: ['#ff6b9a', '#ffd76a', '#7cf5c4', '#7cc4ff', '#b48bff'] };
function confetti(el, lv) {
  if (!el || lv < 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const r = el.getBoundingClientRect();
  const cv = document.createElement('canvas'); cv.className = 'fx-canvas';
  cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; document.body.appendChild(cv);
  const g = cv.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
  const pal = PALETTE[Math.min(4, lv)], n = 40 + lv * 45, cx = r.left + r.width / 2, cy = r.top + r.height / 2;
  const ps = Array.from({ length: n }, () => { const a = Math.random() * Math.PI * 2, v = 3 + Math.random() * (5 + lv * 2.5); return { x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 3, s: 2 + Math.random() * 4, c: pal[Math.floor(Math.random() * pal.length)], r: Math.random() * 6 }; });
  const t0 = performance.now();
  const step = (t) => {
    const u = (t - t0) / 1600; g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of ps) { p.vy += 0.18; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += 0.2; g.save(); g.globalAlpha = Math.max(0, 1 - u); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
    if (u < 1) requestAnimationFrame(step); else cv.remove();
  };
  requestAnimationFrame(step);
}

// Niveau de rareté 0 à 4 (V1 : une parallèle vaut 4)
export const levelOf = (x) => (x.card.variant ? 4 : Math.min(4, TIER_STYLE[x.tier] ?? 0));

// ---- Éclairs d'ouverture (V1) : Haki des rois pour One Piece, foudre pour Pokémon ----
const C0 = [200, 125];
function zig(a, b, n, amp) { const pts = [a], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L; for (let i = 1; i < n; i++) { const t = i / n, o = (Math.random() - 0.5) * 2 * amp; pts.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]); } pts.push(b); return pts; }
const pathOf = (pts) => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
function strikeBolts(game) {
  const out = [];
  if (game === 'onepiece') {
    for (let k = 0; k < 11; k++) {
      const a = (k / 11) * Math.PI * 2 + Math.random() * 0.4, L = 230 + Math.random() * 80;
      const pts = zig(C0, [C0[0] + Math.cos(a) * L, C0[1] + Math.sin(a) * L * 0.8], 9, 16);
      out.push({ d: pathOf(pts), delay: k * 0.03, w: 1 });
      const o = pts[3 + Math.floor(Math.random() * 4)], b = a + (Math.random() < 0.5 ? -0.6 : 0.6);
      out.push({ d: pathOf(zig(o, [o[0] + Math.cos(b) * 70, o[1] + Math.sin(b) * 56], 5, 9)), delay: k * 0.03 + 0.08, w: 0.6 });
    }
  } else {
    for (let k = 0; k < 7; k++) {
      const x = 40 + Math.random() * 320, end = [C0[0] + (Math.random() - 0.5) * 60, C0[1] + (Math.random() - 0.5) * 30];
      const pts = zig([x, -20], end, 8, 18);
      out.push({ d: pathOf(pts), delay: k * 0.07, w: 1 });
      const s = pts[3 + (k % 3)];
      out.push({ d: pathOf(zig(s, [s[0] + (Math.random() - 0.5) * 120, s[1] + 50], 4, 10)), delay: k * 0.07 + 0.05, w: 0.6 });
    }
    for (let k = 0; k < 6; k++) { const a = Math.random() * Math.PI * 2; out.push({ d: pathOf(zig(C0, [C0[0] + Math.cos(a) * 120, C0[1] + Math.sin(a) * 90], 5, 10)), delay: 0.45 + k * 0.03, w: 0.7 }); }
  }
  return out;
}
function Strike({ game }) {
  const bolts = useMemo(() => strikeBolts(game), [game]);
  return (
    <div className={'strike strike-' + game} aria-hidden="true">
      <div className="strike-flash" />
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        {bolts.map((b, i) => (
          <g key={i} className="strike-bolt" style={{ animationDelay: b.delay + 's' }}>
            <path d={b.d} className="s-out" style={{ strokeWidth: 7 * b.w }} pathLength="1" />
            <path d={b.d} className="s-mid" style={{ strokeWidth: 4 * b.w }} pathLength="1" />
            <path d={b.d} className="s-core" style={{ strokeWidth: 1.4 * b.w }} pathLength="1" />
          </g>
        ))}
      </svg>
      {game === 'onepiece' && <div className="strike-ring" />}
    </div>
  );
}

// Emblèmes du booster
function Emblem({ game }) {
  return game === 'onepiece' ? <PirateEmblem size={56} className="" /> : <EnergyEmblem size={56} className="" />;
}

// ---- Le booster (V1) : inclinaison, reflet, languette à déchirer ----
// Vraie illustration du booster si elle est fournie : db/packs/<code>.webp, .png ou .jpg
const PACK_EXT = ['webp', 'png', 'jpg'];
function useRealPack(code) {
  const [state, setState] = useState({ i: 0, ok: false });
  useEffect(() => setState({ i: 0, ok: false }), [code]);
  const src = state.i < PACK_EXT.length ? `db/packs/${code.toLowerCase()}.${PACK_EXT[state.i]}` : null;
  return { src, ok: state.ok, onLoad: () => setState((x) => ({ ...x, ok: true })), onError: () => setState((x) => ({ i: x.i + 1, ok: false })) };
}

function Booster({ prod, onOpen, opening, locked, ready, onPick }) {
  const ref = useRef(null);
  const real = useRealPack(prod.code);
  const drag = useRef(null);
  const [tear, setTear] = useState(0);
  const move = (e) => { const el = ref.current; if (!el || opening) return; const r = el.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height; el.style.setProperty('--ry', ((x - 0.5) * 22).toFixed(1) + 'deg'); el.style.setProperty('--rx', ((0.5 - y) * 16).toFixed(1) + 'deg'); el.style.setProperty('--mx', x * 100 + '%'); el.style.setProperty('--my', y * 100 + '%'); };
  const leave = () => { const el = ref.current; if (el) { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); } };
  const down = (e) => { if (locked || opening || !ready) return; const r = ref.current.getBoundingClientRect(); drag.current = { x: e.clientX, w: r.width }; e.currentTarget.setPointerCapture?.(e.pointerId); };
  const dmove = (e) => { move(e); if (!drag.current) return; const f = Math.max(0, Math.min(1, Math.abs(e.clientX - drag.current.x) / (drag.current.w * 0.75))); setTear(f); if (f >= 0.7) { drag.current = null; setTear(1); onOpen(); } };
  const up = () => { if (drag.current) { drag.current = null; setTear(0); } };
  useEffect(() => { if (!opening) setTear(0); }, [opening]);
  return (
    <div className={'booster-zone' + (opening ? ' is-opening' : '') + (ready ? ' is-ready' : '')}>
      {opening && <Emerge game={prod.game} n={prod.size} />}
      <div ref={ref} className={'booster' + (real.ok ? ' real' : '')} data-game={prod.game} onPointerMove={dmove} onPointerLeave={leave} onPointerDown={down} onPointerUp={up} onPointerCancel={up}
        onClick={() => !ready && !opening && onPick?.()} role={ready ? 'presentation' : 'button'} aria-label={ready ? undefined : 'Ouvrir un booster ' + prod.name} style={{ '--tear': tear }}>
        {real.src && <img className="booster-real" src={real.src} alt={'Booster ' + prod.name} onLoad={real.onLoad} onError={real.onError} draggable="false" />}
        <div className="booster-body">
          {prod.cover && <img src={img(prod.cover.image, 'large')} alt="" className="booster-art" referrerPolicy="no-referrer" draggable="false" onError={(e) => (e.currentTarget.style.display = 'none')} />}
          <div className="booster-shine" aria-hidden="true" />
          <div className="booster-label">
            <span className="booster-emblem"><Emblem game={prod.game} /></span>
            <span className="booster-game">{GAMES[prod.game].label} TCG</span>
            <b className="booster-code">{prod.code.toUpperCase()}</b>
            <b className="booster-name">{prod.name}</b>
            <span className="booster-count">{prod.size} cartes</span>
          </div>
        </div>
        <div className="booster-flap" aria-hidden="true" />
        <div className="booster-tear" aria-hidden="true">
          <span>{locked ? 'Solde insuffisant' : ready ? 'Glisse pour déchirer →' : 'Touche pour ouvrir'}</span>
          <i style={{ width: tear * 100 + '%' }} />
        </div>
      </div>
    </div>
  );
}

// Les cartes sortent du booster pendant l'ouverture
function Emerge({ game, n }) {
  return (
    <div className="emerge" aria-hidden="true" style={{ '--n': n }}>
      {Array.from({ length: n }, (_, i) => <span key={i} className={'emerge-card back-' + game} style={{ '--i': i, '--o': i - (n - 1) / 2 }}><CardBackArt game={game} /></span>)}
    </div>
  );
}

// Dos des cartes : l'emblème de l'univers
function CardBackArt({ game }) {
  return (
    <span className="cb-art">
      <span className="cb-ring" />
      {game === 'onepiece' ? <PirateEmblem size={120} className="cb-emblem" /> : <EnergyEmblem size={120} className="cb-emblem" />}
      <span className="cb-word">NEXUS</span>
    </span>
  );
}

// ---- Carte révélée (V1) ----
function RevealCard({ x, phase, isNew }) {
  const lv = levelOf(x);
  return (
    <div className={`reveal-card lv-${lv} is-${phase}`}>
      <div className="reveal-inner">
        <div className={'reveal-back back-' + x.card.game} aria-hidden="true"><CardBackArt game={x.card.game} /></div>
        <div className="reveal-front">
          <CardImage card={x.card} size="large" eager />
          {lv >= 2 && <span className="reveal-holo" aria-hidden="true" />}
        </div>
      </div>
      {phase === 'front' && lv >= 2 && <span className="reveal-banner">{x.card.variant ? 'Parallèle !' : `${x.card.rarity || x.label} !`}</span>}
      {phase === 'front' && (
        <div className="reveal-caption">
          <b>{x.card.name}</b>
          <span>{x.card.number} · {x.card.rarity}{x.card.variant ? ' · parallèle' : ''}</span>
          {isNew ? <span className="badge-new">Nouvelle</span> : <span className="badge-dup">Déjà obtenue</span>}
        </div>
      )}
    </div>
  );
}
const rarLabel = (x) => (x.card.rarity || x.label) + (x.card.variant ? ' · parallèle' : '');

export default function BoostersPage({ focus }) {
  const d = useData();
  const game = useUniverse();
  const cur = CURRENCY[game];
  const wallet = useStore((s) => s.wallet?.[game]);
  const muted = useStore((s) => !!s.muted);
  const admin = useStore((s) => !!s.admin);
  const [phase, setPhase] = useState('pack'); // pack → ready → opening → reveal → summary
  const [pack, setPack] = useState(null);     // { pulls, fresh:Set<index> }
  const [bulk, setBulk] = useState(null);     // { packs:[{pulls}], fresh }
  const [m, setM] = useState(0);
  const [charging, setCharging] = useState(false);
  const [noFunds, setNoFunds] = useState(false);
  const [odds, setOdds] = useState(false);
  const [gain, setGain] = useState(0);
  const [nonce, setNonce] = useState(0);
  const stageRef = useRef(null);
  const timers = useRef([]);
  const later = (f, ms) => timers.current.push(setTimeout(f, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const prod = useMemo(() => (d.ready ? buildProduct(game, d.cats, d.P, d.fx) : null), [d.ready, game]);
  useEffect(() => { const g = claimDaily(game, PRICE.start, PRICE.daily); if (g) setGain(g); }, [game]);
  useEffect(() => { if (focus && prod) later(() => document.getElementById('collection-virtuelle')?.scrollIntoView({ behavior: 'smooth' }), 250); }, [focus, !!prod]);
  const coins = admin ? Infinity : wallet?.coins ?? PRICE.start;

  // Ajoute un tirage à la collection virtuelle, renvoie les index des nouvelles cartes
  const record = (packsList) => {
    const known = new Set(Object.keys(getState().packs.virtual));
    const fresh = packsList.map((pulls) => { const f = new Set(); pulls.forEach((x, i) => { if (!known.has(x.card.key)) { f.add(i); known.add(x.card.key); } }); return f; });
    update((s) => {
      const w = s.wallet[game];
      w.opened = (w.opened || 0) + packsList.length; w.openedToday = (w.openedToday || 0) + packsList.length;
      for (const pulls of packsList) for (const x of pulls) s.packs.virtual[x.card.key] = (s.packs.virtual[x.card.key] || 0) + 1;
      // saison de classement : cartes obtenues pendant les 30 jours en cours
      const sn = seasonNow();
      if (sn.started) {
        if (!s.season || s.season.n !== sn.n) s.season = { n: sn.n, cards: {}, packs: {} };
        for (const pulls of packsList) for (const x of pulls) s.season.cards[x.card.key] = 1;
        s.season.packs[game] = (s.season.packs[game] || 0) + packsList.length;
      }
      const head = packsList.map((p) => p[p.length - 1]).sort((a, b) => levelOf(b) - levelOf(a))[0];
      if (head && (!w.best || levelOf(head) >= (w.best.lv ?? 0))) w.best = { key: head.card.key, name: head.card.name, rarity: rarLabel(head), lv: levelOf(head) };
    });
    return fresh;
  };

  // 1) Achat : le booster s'affiche seul, au centre de l'écran
  const openOne = useCallback(() => {
    if (!prod || phase === 'opening' || phase === 'ready') return;
    if (!spendCoins(game, PRICE.booster)) { setNoFunds(true); return; }
    setNoFunds(false); setBulk(null); setPack(null); setM(0); setCharging(false);
    setNonce((n) => n + 1);
    setPhase('ready');
  }, [prod, phase, game]);
  // Annuler avant de déchirer : on rend les Berrys / Pokéballs
  const cancelReady = () => { if (!getState().admin) update((s) => { s.wallet[game].coins += PRICE.booster; }); setPhase('pack'); };
  // 2) Déchirage : éclairs, puis les cartes sortent du booster
  const tearOpen = useCallback(() => {
    if (!prod || phase !== 'ready') return;
    const pulls = openPack(prod);
    const [fresh] = record([pulls]);
    setPack({ pulls, fresh });
    SFX.tear(); game === 'onepiece' ? SFX.haki() : SFX.thunder(); vibrate([40, 30, 80]);
    setPhase('opening');
    later(() => setPhase('reveal'), 2000);
  }, [prod, phase, game]);
  useEffect(() => {
    const on = phase !== 'pack';
    document.body.classList.toggle('modal-open', on);
    return () => document.body.classList.remove('modal-open');
  }, [phase]);

  const openDisplay = () => {
    if (!prod) return;
    if (!spendCoins(game, PRICE.display)) { setNoFunds(true); return; }
    setNoFunds(false);
    const list = Array.from({ length: PRICE.displayPacks }, () => openPack(prod));
    const fresh = record(list);
    setBulk({ packs: list.map((pulls, i) => ({ pulls, fresh: fresh[i] })), fresh: fresh.reduce((s, f) => s + f.size, 0) });
    setPack(null); setPhase('summary'); SFX.tear();
    const top = Math.max(...list.flatMap((p) => p.map(levelOf)));
    if (top >= 2) { SFX.rare(top); later(() => confetti(stageRef.current, top), 100); }
  };

  const next = useCallback(() => {
    if (!pack || phase !== 'reveal' || charging) return;
    if (m >= pack.pulls.length) { setPhase('summary'); return; }
    const x = pack.pulls[m], lv = levelOf(x);
    const show = () => {
      setCharging(false); setM((v) => v + 1); SFX.flip();
      if (lv >= 2) { SFX.rare(lv); vibrate(lv >= 4 ? [60, 40, 120] : 30); later(() => confetti(stageRef.current?.querySelector('.reveal-card'), lv), 80); }
    };
    if (lv >= 2) { setCharging(true); SFX.charge(); later(show, 900); } else show();
  }, [pack, phase, charging, m]);
  useEffect(() => {
    const f = (e) => { if ((e.key === ' ' || e.key === 'Enter') && phase === 'reveal' && !e.target.closest('button,a,input,select')) { e.preventDefault(); next(); } };
    addEventListener('keydown', f); return () => removeEventListener('keydown', f);
  }, [next, phase]);

  if (!d.ready || !prod) return <div className="page"><Loading /></div>;
  const shown = pack && m > 0 ? pack.pulls[m - 1] : null;
  const upcoming = pack && m < pack.pulls.length ? pack.pulls[m] : null;
  const left = pack ? pack.pulls.length - m : 0;
  const locked = coins < PRICE.booster;
  const actions = (again) => (
    <div className="pack-actions">
      <button className={'btn primary big' + (again ? ' pulse' : '')} disabled={locked} onClick={openOne}><span className="coin-ico">{cur.sym}</span>{again ? 'Ouvrir un autre booster' : 'Ouvrir le booster'} · {PRICE.booster}</button>
      <button className="btn ghost big display-btn" disabled={coins < PRICE.display} onClick={openDisplay}><span className="display-ribbon">10 + 2 offerts</span>Display · {PRICE.displayPacks} boosters · {fmtNum(PRICE.display)}</button>
      {again && <button className="btn ghost" onClick={() => { setPhase('pack'); setPack(null); setBulk(null); }}>Revenir au booster</button>}
    </div>
  );

  return (
    <div className="page boosters-page">
      <div className="kicker">{GAMES[game].label} · boosters virtuels</div>
      <h1 className="page-title">Booster {prod.name}</h1>
      <p className="lead">Déchire un booster de la dernière extension. Chaque carte obtenue est cochée « Obtenue » dans ta collection virtuelle, juste en dessous ; les autres restent « À découvrir ».</p>

      <div className={'wallet ' + game}>
        <span className="coin" aria-hidden="true">{cur.sym}</span>
        <div><b>{admin ? '∞' : fmtNum(coins)}</b><span>{cur.name}</span></div>
        {admin ? <span className="admin-badge">Mode administrateur · illimité</span> : <a className="btn small ghost" href={href('/boutique')}><Icon name="plus" size={16} />Obtenir des {cur.name}</a>}
        <button className="icon-btn" onClick={() => update((s) => { s.muted = !s.muted; })} aria-label={muted ? 'Activer le son' : 'Couper le son'}>{muted ? '🔇' : '🔊'}</button>
        <small>Booster : {PRICE.booster} {cur.name} · Display : {fmtNum(PRICE.display)} pour {PRICE.displayPacks} boosters · +{PRICE.daily} {cur.name} chaque jour, même les jours où tu ne viens pas. Monnaie virtuelle, sans valeur réelle.</small>
        {gain > 0 && <span className="gain">+{fmtNum(gain)} {cur.name} reçus depuis ta dernière visite</span>}
      </div>

      {phase !== 'pack' && <div className={'focus-bg game-' + game} aria-hidden="true" />}
      <section className={`pack-stage2 phase-${phase} game-${game}` + (phase !== 'pack' ? ' focus' : '')} ref={stageRef}>
        {phase !== 'pack' && phase !== 'opening' && <button className="icon-btn focus-close" onClick={() => (phase === 'ready' ? cancelReady() : (setPhase('pack'), setPack(null), setBulk(null)))} aria-label="Fermer"><Icon name="x" /></button>}
        {phase === 'opening' && <Strike key={nonce} game={game} />}
        {phase === 'pack' && (
          <>
            <Booster prod={prod} onPick={openOne} locked={locked} />
            {actions(false)}
            {(noFunds || locked) && <p className="notice">Solde insuffisant : il faut {PRICE.booster} {cur.name} pour ouvrir un booster (tu en as {fmtNum(wallet?.coins ?? 0)}). Reviens demain pour le bonus quotidien, ou passe par la <a className="link" href={href('/boutique')}>boutique</a>.</p>}
            <p className="small faint">{prod.composition} <button className="link small" onClick={() => setOdds(true)}>Voir les taux</button></p>
          </>
        )}
        {(phase === 'ready' || phase === 'opening') && (
          <div className="focus-pack">
            <p className="focus-title">{phase === 'ready' ? prod.name : '\u00a0'}</p>
            <Booster key={nonce} prod={prod} onOpen={tearOpen} ready={phase === 'ready'} opening={phase === 'opening'} />
            <p className={'swipe-hint' + (phase === 'opening' ? ' gone' : '')}><span className="swipe-hand" aria-hidden="true">👆</span>Fais glisser ton doigt sur le booster pour l’ouvrir</p>
          </div>
        )}

        {phase === 'reveal' && pack && (
          <>
            <p className="reveal-count" aria-live="polite">{m} / {pack.pulls.length}</p>
            <button className="reveal-table" onClick={next} aria-label={upcoming ? `Retourner la carte ${m + 1} sur ${pack.pulls.length}` : 'Voir le résumé'}>
              {charging && upcoming ? <RevealCard key={'c' + m} x={upcoming} phase="charging" />
                : shown ? <RevealCard key={'f' + m} x={shown} phase="front" isNew={pack.fresh.has(m - 1)} />
                : <span className="reveal-hint">Touche le paquet pour retourner la première carte</span>}
              {left > 0 && !charging && <span className="deck" aria-hidden="true">{Array.from({ length: Math.min(6, left) }, (_, i) => <i key={i} className={'back-' + game} style={{ '--d': i }}><CardBackArt game={game} /></i>)}<b>{left}</b></span>}
            </button>
            <div className="row center">
              <button className="btn primary" onClick={next} disabled={charging}>{upcoming ? 'Carte suivante' : 'Voir le résumé'}</button>
              <button className="btn ghost" onClick={() => { setM(pack.pulls.length); setPhase('summary'); }}>Tout révéler</button>
            </div>
            <div className="reveal-strip" aria-label="Cartes déjà révélées">
              {pack.pulls.slice(0, Math.max(0, m - 1)).map((x, i) => <span key={i} className={'strip-card lv-' + levelOf(x)} title={x.card.name + ' ' + x.card.number}><CardImage card={x.card} /></span>)}
            </div>
          </>
        )}

        {phase === 'summary' && pack && !bulk && (
          <div className="summary">
            {(() => { const h = pack.pulls[pack.pulls.length - 1]; return <p className="pack-hit-line">Carte de tête : <b>{h.card.name}</b> ({rarLabel(h)}) · <b>{pack.fresh.size}</b> nouvelle{pack.fresh.size > 1 ? 's' : ''} carte{pack.fresh.size > 1 ? 's' : ''} dans ta collection virtuelle.</p>; })()}
            <div className="summary-grid">
              {pack.pulls.map((x, i) => (
                <a key={i} href={cardHref(x.card)} className={'summary-card lv-' + levelOf(x)} style={{ '--i': i }}>
                  <span className="summary-img"><CardImage card={x.card} />{pack.fresh.has(i) && <span className="badge-new">Nouvelle</span>}</span>
                  <span className="summary-meta"><b>{x.card.name}</b><span>{x.card.number} · {rarLabel(x)}</span></span>
                </a>
              ))}
            </div>
            {actions(true)}
          </div>
        )}

        {phase === 'summary' && bulk && (
          <div className="summary">
            <p className="pack-hit-line"><b>{bulk.packs.length} boosters</b> ouverts d’un coup · <b>{bulk.fresh}</b> nouvelle{bulk.fresh > 1 ? 's' : ''} carte{bulk.fresh > 1 ? 's' : ''} dans ta collection virtuelle.</p>
            <div className="bulk-list">
              {bulk.packs.map((p, i) => {
                const h = p.pulls[p.pulls.length - 1];
                return (
                  <div key={i} className="bulk-pack" style={{ '--i': i }}>
                    <span className="bulk-num">#{i + 1}</span>
                    {p.pulls.map((x, k) => <a key={k} href={cardHref(x.card)} className={'strip-card lv-' + levelOf(x) + (p.fresh.has(k) ? ' fresh' : '')} title={x.card.name + ' ' + x.card.number + ' · ' + rarLabel(x)}><CardImage card={x.card} /></a>)}
                    <span className="bulk-head"><b>{h.card.name}</b><span>{rarLabel(h)}</span></span>
                  </div>
                );
              })}
            </div>
            {actions(true)}
          </div>
        )}
      </section>

      <div className="pack-stats">
        <div><span>Aujourd’hui</span><b>{fmtNum(wallet?.openedToday || 0)}</b><small>booster{(wallet?.openedToday || 0) > 1 ? 's' : ''} ouvert{(wallet?.openedToday || 0) > 1 ? 's' : ''}</small></div>
        <div><span>Au total</span><b>{fmtNum(wallet?.opened || 0)}</b><small>booster{(wallet?.opened || 0) > 1 ? 's' : ''} {GAMES[game].label}</small></div>
        {wallet?.best && <a href={href('/carte/' + encodeURIComponent(wallet.best.key))}><span>Meilleur tirage</span><b>{wallet.best.name}</b><small>{wallet.best.rarity}</small></a>}
      </div>

      <League prod={prod} />
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
  const shown = cards.filter((c) => filter === 'all' || (filter === 'have' ? virtual[c.key] : !virtual[c.key]));
  return (
    <section className="section" id="collection-virtuelle">
      <header className="section-head">
        <div><div className="kicker">Collection virtuelle</div><h2>{prod.name}</h2></div>
        <Seg value={filter} onChange={setFilter} label="Filtre" options={[['all', 'Toutes'], ['have', 'Obtenues'], ['missing', 'À découvrir']]} />
      </header>
      <div className="vc-progress"><div className="progress big"><i style={{ width: (have.length / Math.max(1, cards.length)) * 100 + '%' }} /></div><b>{have.length} / {cards.length}</b><span className="muted">cartes obtenues{prod.game === 'onepiece' ? ' (parallèles comprises)' : ''} · {Math.round((have.length / Math.max(1, cards.length)) * 100)} %</span></div>
      <div className="grid tiles vc">
        {shown.map((c) => virtual[c.key] ? (
          <a key={c.key} className="tile got" href={cardHref(c)}><div className="tile-img"><CardImage card={c} />{virtual[c.key] > 1 && <span className="qty">×{virtual[c.key]}</span>}<span className="got-badge">Obtenue</span></div><div className="tile-body"><div className="tile-name">{c.name}</div><div className="tile-meta">{c.number} · {c.rarity}{c.variant ? ' · ' + c.variant.toLowerCase() : ''}</div></div></a>
        ) : (
          <div key={c.key} className="tile missing"><div className="tile-img"><CardImage card={c} /><span className="q">?</span><span className="miss-badge">À découvrir</span></div><div className="tile-body"><div className="tile-name">{c.name}</div><div className="tile-meta">{c.number} · {c.rarity}{c.variant ? ' · ' + c.variant.toLowerCase() : ''}</div></div></div>
        ))}
      </div>
      <p className="source-note">Cartes virtuelles : aucune carte physique, aucune valeur monétaire. Touche une carte obtenue pour voir sa fiche.</p>
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

// ---- Collection virtuelle : même page que le booster ----
export function VirtualCollection() {
  return <BoostersPage focus />;
}
