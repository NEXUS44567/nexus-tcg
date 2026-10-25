import React, { useEffect, useRef } from 'react';
import { cardHref } from '../lib/hooks.js';
import { CardImage, Price, GameTag } from '../components.jsx';

// Podium en 3D (CSS 3D, sans WebGL) : socles en métal, cartes qui flottent et tournent,
// projecteurs, rayons de lumière derrière la première place, scène qui suit le doigt ou la souris.
const METAL = { 1: 'gold', 2: 'silver', 3: 'bronze' };
const LABEL = { 1: '1er', 2: '2e', 3: '3e' };

function Block({ rank }) {
  return (
    <div className={'p3-block ' + METAL[rank]} style={{ '--h': `var(--h${rank})` }}>
      <span className="f front"><b className="p3-num">{rank}</b></span>
      <span className="f back" />
      <span className="f left" />
      <span className="f right" />
      <span className="f top"><i className="p3-shadow" /></span>
    </div>
  );
}

function Spot({ r, rank, delay }) {
  if (!r) return <div className="p3-col empty" />;
  return (
    <div className={'p3-col r' + rank} style={{ '--d': delay + 's' }}>
      <div className="p3-light" aria-hidden="true" />
      <a className="p3-card" href={cardHref(r.c)} aria-label={`${LABEL[rank]} : ${r.c.name}`}>
        <div className="p3-spin">
          <CardImage card={r.c} eager />
          <span className="p3-holo" aria-hidden="true" />
          {rank === 1 && <span className="p3-crown" aria-hidden="true"><svg viewBox="0 0 64 40"><path d="M4 36 8 8l14 14L32 2l10 20L56 8l4 28z" /><circle cx="8" cy="8" r="4" /><circle cx="32" cy="3" r="4" /><circle cx="56" cy="8" r="4" /></svg></span>}
        </div>
      </a>
      <Block rank={rank} />
    </div>
  );
}

// L'estrade : un grand socle commun ; sa face avant porte les plaques des trois cartes
function Plate({ r, rank }) {
  if (!r) return <div className="p3-plate empty" />;
  return (
    <a className={'p3-plate r' + rank} href={cardHref(r.c)}>
      <span className="p3-rank">{LABEL[rank]}</span>
      <b title={r.c.name}>{r.c.name}</b>
      <small><GameTag game={r.c.game} /> {r.c.number}{r.c.variant ? ' · ' + r.c.variant : ''}</small>
      <span className="p3-price"><Price card={r.c} /></span>
    </a>
  );
}
function Stage({ items }) {
  return (
    <div className="p3-stage">
      <span className="sf front">{items.map(([r, k]) => <Plate key={k} r={r} rank={k} />)}</span>
      <span className="sf top">{items.map(([, k]) => <i key={k} className={'spot s' + k} />)}</span>
      <span className="sf left" /><span className="sf right" /><span className="sf back" />
    </div>
  );
}

export default function Podium3D({ first, second, third }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    let raf = 0, tx = 0, ty = 0, cx = 0, cy = 0, idle = true, t0 = performance.now();
    const set = (x, y) => { tx = x; ty = y; idle = false; clearTimeout(set.t); set.t = setTimeout(() => (idle = true), 2500); };
    const onMove = (e) => { const r = el.getBoundingClientRect(); set(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2); };
    const onOrient = (e) => { if (e.gamma == null) return; set(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 40) / 40))); };
    const loop = (t) => {
      if (idle) { const k = (t - t0) / 1000; tx = Math.sin(k * 0.5) * 0.6; ty = Math.sin(k * 0.35) * 0.25; }
      cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
      el.style.setProperty('--ry', (cx * 22).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-18 - cy * 6).toFixed(2) + 'deg');
      raf = requestAnimationFrame(loop);
    };
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) raf = requestAnimationFrame(loop);
    el.addEventListener('pointermove', onMove);
    window.addEventListener('deviceorientation', onOrient);
    return () => { cancelAnimationFrame(raf); el.removeEventListener('pointermove', onMove); window.removeEventListener('deviceorientation', onOrient); };
  }, []);
  return (
    <div className="podium3d" ref={ref}>
      <div className="p3-scene">
        <div className="p3-floor" aria-hidden="true" />
        <div className="p3-row">
          <Spot r={second} rank={2} delay={0.25} />
          <Spot r={first} rank={1} delay={0.5} />
          <Spot r={third} rank={3} delay={0} />
        </div>
        <Stage items={[[second, 2], [first, 1], [third, 3]]} />
      </div>
    </div>
  );
}
