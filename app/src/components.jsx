import React, { useEffect, useMemo, useRef, useState } from 'react';
import { img, priceOf, eurOf, CUR, fmtEur, fmtUsd, fmtPct, fmtDate, search, GAMES } from './lib/data.js';
import { useData, href, cardHref, go } from './lib/hooks.js';
import { useStore, toggleWatch, toggleCompare, useUniverse } from './lib/store.js';

export function Icon({ name, size = 20 }) {
  const p = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    home: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><rect x="8" y="7" width="8" height="10" rx="1" /></>,
    pack: <><path d="M6 3h12l-1 3H7z" /><rect x="5" y="6" width="14" height="15" rx="2" /><path d="M9 11h6M9 15h4" /></>,
    sets: <><rect x="3" y="8" width="8" height="12" rx="1.2" transform="rotate(-10 7 14)" /><rect x="13" y="8" width="8" height="12" rx="1.2" transform="rotate(10 17 14)" /><rect x="8" y="4" width="8" height="12" rx="1.2" fill="var(--bg-2)" /></>,
    album: <><rect x="5" y="3" width="15" height="18" rx="2" /><path d="M3 7.5h4M3 12h4M3 16.5h4" /><rect x="9" y="6" width="3.6" height="5" rx=".6" /><rect x="14" y="6" width="3.6" height="5" rx=".6" /><rect x="9" y="13" width="3.6" height="5" rx=".6" /><rect x="14" y="13" width="3.6" height="5" rx=".6" /></>,
    chart: <><path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 3 5-6" /></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    bell: <><path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" /><path d="M10 20a2 2 0 0 0 4 0" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    x: <path d="M6 6l12 12M18 6 6 18" />,
    up: <path d="m6 15 6-6 6 6" />,
    down: <path d="m6 9 6 6 6-6" />,
    compare: <><path d="M8 3v18M16 3v18" /><path d="M3 8h5M16 16h5" /></>,
    star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
    camera: <><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
    trash: <><path d="M4 7h16M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
    ext: <><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v6H4V6h6" /></>,
    trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0z" /><path d="M8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M9 17h6v4H9z" /></>,
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
    check: <path d="m5 12 5 5 9-10" />,
    grid: <><rect x="4" y="4" width="7" height="7" rx="1" /><rect x="13" y="4" width="7" height="7" rx="1" /><rect x="4" y="13" width="7" height="7" rx="1" /><rect x="13" y="13" width="7" height="7" rx="1" /></>,
    list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
    refresh: <><path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 5v6h-6" /></>,
    crew: <><path d="M3 15h18l-2.4 4.2a2 2 0 0 1-1.7 1H7.1a2 2 0 0 1-1.7-1z" /><path d="M12 3v12" /><path d="M13 5.5c3.2 1.2 5 3.6 5 7h-5z" /><path d="M11 7.5c-2.4 1-3.8 2.8-3.8 5H11z" /><path d="M12 3h3.5l-1 1.2 1 1.3H12" /></>,
    dex: <><rect x="4" y="2" width="16" height="20" rx="2.5" /><circle cx="8.5" cy="6" r="2" /><path d="M13 5.5h.01M15.5 5.5h.01M4 9h16" /><rect x="7" y="11.5" width="10" height="6" rx="1" /><path d="M8 20h.01M13 20h3" /></>,
    swap: <><path d="M7 4 3 8l4 4" /><path d="M3 8h13a4 4 0 0 1 4 4" /><path d="m17 20 4-4-4-4" /><path d="M21 16H8a4 4 0 0 1-4-4" /></>,
  }[name];
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p}</svg>;
}

export function CardImage({ card, size = 'small', className = '', eager = false, alt }) {
  const [state, setState] = useState('loading');
  const [useEn, setUseEn] = useState(false);
  const local = img(card?.image, size);
  const src = useEn && card?.en?.image ? img(card.en.image, size) : local;
  useEffect(() => { setState(src ? 'loading' : 'error'); }, [src]);
  useEffect(() => { setUseEn(false); }, [local]);
  const fail = () => { if (!useEn && card?.en?.image && card.en.image !== card.image) setUseEn(true); else setState('error'); };
  return (
    <div className={'cimg ' + className + ' ' + state + (card?.lang === 'ja' ? ' jp' : '')} data-game={card?.game}>
      {src && state !== 'error' && <img src={src} alt={alt ?? (card ? card.name + ' ' + card.number : '')} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onLoad={() => setState('ok')} onError={fail} />}
      {state === 'error' && <div className="cimg-fallback"><span>{card?.name}</span>{card?.nameFr && card.lang === 'ja' && <em>{card.nameFr}</em>}<small>{card?.number}</small></div>}
    </div>
  );
}

export function LangTag({ card }) {
  if (card?.lang === 'ja') return <span className="ltag ja" title="Carte japonaise">JP</span>;
  if (card?.local === 'fr') return <span className="ltag fr" title="Nom et image de la version française">FR</span>;
  if (card?.local === 'ja') return <span className="ltag ja" title="Nom et image de la version japonaise">JP</span>;
  return null;
}

export function Delta({ pct, small }) {
  if (pct == null || !isFinite(pct)) return null;
  const dir = pct > 0 ? 'up' : pct < 0 ? 'down' : 'flat';
  return <span className={'delta ' + dir + (small ? ' small' : '')}>{dir === 'up' ? '▲' : dir === 'down' ? '▼' : '='} {fmtPct(Math.abs(pct)).replace('+', '')}</span>;
}

export function GameTag({ game }) {
  return <span className={'gtag ' + game}>{GAMES[game]?.short}</span>;
}

export function Price({ card, big }) {
  const { P, fx } = useData();
  const p = priceOf(card, P);
  const eur = eurOf(card, P, fx);
  if (eur == null) return <span className={'price none' + (big ? ' big' : '')}>Pas de prix relevé</span>;
  return (
    <span className={'price' + (big ? ' big' : '')} title={(p.converted ? 'Prix TCGplayer en dollars' : 'Prix Cardmarket en euros') + ((p.converted ? 'USD' : 'EUR') !== CUR.code ? ', converti en ' + CUR.name : '')}>
      {(p.converted ? 'USD' : 'EUR') !== CUR.code && <span className="approx">≈</span>}{fmtEur(eur)}
    </span>
  );
}

export function CardTile({ card, extra, rank, compact, onClick }) {
  const { P, fx } = useData();
  const watch = useStore((s) => !!s.watch[card.key]);
  const p = priceOf(card, P);
  const set = useData().cats?.[card.game]?.sets.get(card.set);
  const trend = p && card.game === 'pokemon' && p.avg7 && p.avg30 ? ((p.avg7 - p.avg30) / p.avg30) * 100 : null;
  const content = (
    <>
      <div className="tile-img">
        <CardImage card={card} />
        {rank && <span className={'rank r' + rank}>{rank}</span>}
        {watch && <span className="tile-watch" title="Suivie"><Icon name="eye" size={14} /></span>}
      </div>
      <div className="tile-body">
        <div className="tile-name">{card.name}</div>
        <div className="tile-meta"><GameTag game={card.game} /><LangTag card={card} /> <span>{card.number}</span>{card.variant && <span className="variant">{card.variant}</span>}</div>
        {!compact && <div className="tile-set">{set?.name}</div>}
        <div className="tile-price"><Price card={card} />{trend != null && Math.abs(trend) >= 1 && <Delta pct={trend} small />}{extra}</div>
      </div>
    </>
  );
  if (onClick) return <button type="button" className="tile" onClick={onClick}>{content}</button>;
  return <a className="tile" href={cardHref(card)}>{content}</a>;
}

export function Section({ title, kicker, action, children, id, className = '' }) {
  return (
    <section className={'section ' + className} id={id}>
      <header className="section-head">
        <div>{kicker && <div className="kicker">{kicker}</div>}<h2>{title}</h2></div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function Loading({ label = 'Chargement…' }) {
  return <div className="loading"><span className="spinner" />{label}</div>;
}

export function Empty({ icon = 'album', title, children, action }) {
  return <div className="empty"><Icon name={icon} size={36} /><h3>{title}</h3>{children && <p>{children}</p>}{action}</div>;
}

// ---- Recherche avec suggestions instantanées ----
export function SearchBox({ autoFocus, big, initial = '', onDone, placeholder = 'Cherche une carte…', scope }) {
  const { ready, cats, P } = useData();
  const universe = useUniverse();
  const game = scope || universe;
  const [q, setQ] = useState(initial);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const ref = useRef();
  const results = useMemo(() => (ready && q.trim().length >= 2 ? search(cats, q, { limit: 8, P, game }) : []), [ready, q, game]);
  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    const f = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('pointerdown', f); return () => document.removeEventListener('pointerdown', f);
  }, []);
  const submit = (e) => {
    e?.preventDefault();
    if (open && results[sel] && sel >= 0 && e?.type !== 'submit-all') { go('/carte/' + encodeURIComponent(results[sel].key)); }
    else if (q.trim()) go('/recherche?q=' + encodeURIComponent(q.trim()) + (game !== 'all' ? '&u=' + game : ''));
    setOpen(false); onDone?.();
  };
  return (
    <form className={'searchbox' + (big ? ' big' : '')} onSubmit={submit} ref={ref} role="search">
      <Icon name="search" size={big ? 24 : 18} />
      <input
        value={q} autoFocus={autoFocus} placeholder={placeholder} aria-label="Rechercher une carte"
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(results.length, s + 1)); }
          if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
          if (e.key === 'Escape') setOpen(false);
        }}
        enterKeyHint="search" autoComplete="off" spellCheck="false"
      />
      {q && <button type="button" className="clear" onClick={() => setQ('')} aria-label="Effacer"><Icon name="x" size={16} /></button>}
      <button type="submit" className="btn primary go">Chercher</button>
      {open && results.length > 0 && (
        <ul className="suggest" role="listbox">
          {results.map((c, i) => (
            <li key={c.key} role="option" aria-selected={i === sel}>
              <a href={cardHref(c)} className={i === sel ? 'on' : ''} onMouseEnter={() => setSel(i)} onClick={() => { setOpen(false); onDone?.(); }}>
                <CardImage card={c} className="mini" />
                <span className="s-name">{c.name}<small><GameTag game={c.game} /> {c.number}{c.variant ? ' · ' + c.variant : ''} · {cats[c.game].sets.get(c.set)?.name}</small></span>
                <Price card={c} />
              </a>
            </li>
          ))}
          <li><a href={href('/recherche?q=' + encodeURIComponent(q) + (game !== 'all' ? '&u=' + game : ''))} className={'all' + (sel === results.length ? ' on' : '')} onClick={() => { setOpen(false); onDone?.(); }}>Voir tous les résultats pour « {q} »</a></li>
        </ul>
      )}
    </form>
  );
}

// ---- Graphique de prix (SVG, plusieurs séries) ----
export function PriceChart({ series, height = 220, empty }) {
  const [hover, setHover] = useState(null);
  const ref = useRef();
  const pts = series.flatMap((s) => s.points);
  if (pts.length < 2) return <div className="chart-empty">{empty || 'L’historique se construit : un relevé par jour.'}</div>;
  const dates = [...new Set(pts.map((p) => p[0]))].sort();
  const W = 640, H = height, L = 52, R = 12, T = 14, B = 26;
  const vals = pts.map((p) => p[1]);
  let min = Math.min(...vals), max = Math.max(...vals);
  if (min === max) { min *= 0.9; max *= 1.1; }
  const pad = (max - min) * 0.12; min = Math.max(0, min - pad); max += pad;
  const x = (d) => L + (dates.length === 1 ? 0 : (dates.indexOf(d) / (dates.length - 1)) * (W - L - R));
  const y = (v) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const ticks = [0, 0.5, 1].map((t) => min + t * (max - min));
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (dates.length - 1));
    setHover(Math.max(0, Math.min(dates.length - 1, i)));
  };
  const hd = hover != null ? dates[hover] : null;
  return (
    <div className="chart">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Évolution du prix">
        {ticks.map((t, i) => <g key={i}><line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" /><text x={L - 8} y={y(t) + 4} className="ylab">{fmtEur(t, { decimals: t < 10 ? 2 : 0 })}</text></g>)}
        <text x={L} y={H - 6} className="xlab">{fmtDate(dates[0], { day: 'numeric', month: 'short' })}</text>
        <text x={W - R} y={H - 6} className="xlab end">{fmtDate(dates.at(-1), { day: 'numeric', month: 'short' })}</text>
        {series.map((s, i) => {
          const d = s.points.map((p, k) => (k ? 'L' : 'M') + x(p[0]).toFixed(1) + ' ' + y(p[1]).toFixed(1)).join(' ');
          return <g key={i}>
            {series.length === 1 && s.points.length > 1 && <path d={d + ` L ${x(s.points.at(-1)[0])} ${H - B} L ${x(s.points[0][0])} ${H - B} Z`} className="area" style={{ fill: s.color }} />}
            <path d={d} className="line" style={{ stroke: s.color }} />
            {s.points.length < 12 && s.points.map((p, k) => <circle key={k} cx={x(p[0])} cy={y(p[1])} r="3" style={{ fill: s.color }} />)}
          </g>;
        })}
        {hd && <line x1={x(hd)} x2={x(hd)} y1={T} y2={H - B} className="cursor" />}
      </svg>
      {hd && (
        <div className="chart-tip" style={{ left: (x(hd) / W) * 100 + '%' }}>
          <b>{fmtDate(hd, { day: 'numeric', month: 'short', year: 'numeric' })}</b>
          {series.map((s, i) => { const p = s.points.find((q) => q[0] === hd); return p ? <span key={i}><i style={{ background: s.color }} />{s.label ? s.label + ' : ' : ''}{fmtEur(p[1])}</span> : null; })}
        </div>
      )}
    </div>
  );
}

export function Sparkline({ points, color = 'currentColor', width = 90, height = 28 }) {
  if (!points || points.length < 2) return null;
  const v = points.map((p) => p[1]);
  const min = Math.min(...v), max = Math.max(...v) || 1;
  const d = v.map((n, i) => (i ? 'L' : 'M') + ((i / (v.length - 1)) * width).toFixed(1) + ' ' + (height - 2 - ((n - min) / (max - min || 1)) * (height - 4)).toFixed(1)).join(' ');
  return <svg className="spark" width={width} height={height} viewBox={`0 0 ${width} ${height}`}><path d={d} fill="none" stroke={color} strokeWidth="2" /></svg>;
}

export function WatchButton({ card, baseline, label = true }) {
  const on = useStore((s) => !!s.watch[card.key]);
  return <button type="button" className={'btn ' + (on ? 'on' : 'ghost')} onClick={() => toggleWatch(card.key, baseline)} aria-pressed={on}><Icon name="eye" size={18} />{label && (on ? 'Suivie' : 'Suivre le prix')}</button>;
}
export function CompareButton({ card, label = true }) {
  const on = useStore((s) => s.compare.includes(card.key));
  return <button type="button" className={'btn ' + (on ? 'on' : 'ghost')} onClick={() => toggleCompare(card.key)} aria-pressed={on}><Icon name="compare" size={18} />{label && (on ? 'Dans le comparateur' : 'Comparer')}</button>;
}

export function Modal({ open, onClose, title, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const f = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', f);
    document.body.classList.add('modal-open');
    return () => { document.removeEventListener('keydown', f); document.body.classList.remove('modal-open'); };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-back" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <header><h3>{title}</h3><button className="icon-btn" onClick={onClose} aria-label="Fermer"><Icon name="x" /></button></header>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function Seg({ value, onChange, options, label }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map(([v, l]) => <button key={v} type="button" role="radio" aria-checked={value === v} className={value === v ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}

export function SourceNote({ game, ja }) {
  const { P, M } = useData();
  const g = M?.games?.[game];
  const s = P?.[game]?.source;
  if (ja) return s?.ja ? <p className="source-note">Source : <a href={s.ja.url} target="_blank" rel="noreferrer">{s.ja.name}</a> · relevé du {fmtDate(P[game].updatedAt)} · {s.ja.count.toLocaleString('fr-FR')} cartes japonaises avec un prix</p> : <p className="source-note">Prix des cartes japonaises pas encore relevés.</p>;
  if (!s) return <p className="source-note">Prix pas encore relevés pour ce jeu.</p>;
  return (
    <p className="source-note">
      Source : <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> · relevé du {fmtDate(P[game].updatedAt)}
      {game === 'onepiece' && s.fx && <> · converti au taux {s.fx.usdEur.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} € pour 1 $ ({s.fx.source})</>}
      {g && <> · {g.priced.toLocaleString('fr-FR')} cartes avec un prix</>}
      {CUR.code !== 'EUR' && <> · affiché en {CUR.name} : 1 € = {CUR.rate.toLocaleString('fr-FR', { maximumFractionDigits: CUR.code === 'JPY' ? 2 : 4 })} {CUR.sym}</>}
    </p>
  );
}

export { fmtEur, fmtUsd, fmtPct, fmtDate };

// Logo du site : deux cartes et un N, en une seule couleur
export const LOGO_COLOR = '#f6c445';
export function Logo({ size = 34, color = LOGO_COLOR }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true">
      <rect x="7" y="5" width="20" height="28" rx="3.5" transform="rotate(-12 17 19)" fill="none" stroke={color} strokeWidth="2.6" />
      <rect x="12" y="7" width="21" height="29" rx="3.5" transform="rotate(7 22 21)" fill={color} />
      <path d="M17.5 27.5V15.5l7.5 12V15.5" stroke="#0b0e1a" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="rotate(7 22 21)" />
    </svg>
  );
}

// ---- Emblèmes originaux de NEXUS, style cartoon manga (aucun logo officiel) ----
// Gros contours noirs, aplats de couleur, ombre en une teinte, trame de points et traits de vitesse.
function useIds() { const id = React.useId().replace(/:/g, ''); return (n) => `${n}-${id}`; }
const INK = '#15121f';
const pt = (cx, cy, r, a) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
const starPts = (cx, cy, r1, r2, n, rot = -Math.PI / 2) => Array.from({ length: n * 2 }, (_, k) => pt(cx, cy, k % 2 ? r2 : r1, rot + (k * Math.PI) / n).map((v) => v.toFixed(1)).join(',')).join(' ');
function Halftone({ g, color }) {
  return <pattern id={g('dots')} width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="4.5" cy="4.5" r="1.9" fill={color} /></pattern>;
}
function SpeedLines({ cx = 100, cy = 100, r0 = 70, r1 = 98, n = 28, color = INK }) {
  return <g stroke={color} strokeLinecap="round">{Array.from({ length: n }, (_, k) => { const a = (k / n) * Math.PI * 2 + (k % 2) * 0.05; const [x0, y0] = pt(cx, cy, r0 + (k % 3) * 4, a); const [x1, y1] = pt(cx, cy, r1, a); return <line key={k} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={k % 3 ? 2 : 3.5} />; })}</g>;
}

// One Piece : boussole ronde à 8 pointes, cadran crème et tête de mort (version simplifiée)
export function PirateEmblem({ size = 44, className = 'emblem' }) {
  const spikes = Array.from({ length: 8 }, (_, k) => {
    const a = -Math.PI / 2 + (k * Math.PI) / 4, long = k % 2 === 0;
    const [tx, ty] = pt(100, 100, long ? 98 : 86, a), [lx, ly] = pt(100, 100, 66, a - (long ? 0.24 : 0.2)), [rx, ry] = pt(100, 100, 66, a + (long ? 0.24 : 0.2));
    return { k, long, d: `M${lx} ${ly}L${tx} ${ty}L${rx} ${ry}Z` };
  });
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden="true">
      {spikes.map((x) => <path key={x.k} d={x.d} fill={x.long ? '#ffd23f' : '#ffffff'} stroke={INK} strokeWidth="5" strokeLinejoin="round" />)}
      <circle cx="100" cy="100" r="68" fill="#e2302b" stroke={INK} strokeWidth="6" />
      <circle cx="100" cy="100" r="52" fill="#fff8e6" stroke={INK} strokeWidth="5" />
      <g transform="translate(100 99) scale(.72) translate(-100 -95)">
        <path d="M100 62c-20 0-33 13-33 30 0 10 5 17 11 21v9c0 4 3 6 6 6h32c3 0 6-2 6-6v-9c6-4 11-11 11-21 0-17-13-30-33-30z" fill="#ffffff" stroke={INK} strokeWidth="5.5" strokeLinejoin="round" />
        <ellipse cx="88" cy="93" rx="9" ry="10" fill={INK} />
        <ellipse cx="112" cy="93" rx="9" ry="10" fill={INK} />
        <path d="M100 103l-5 8h10z" fill={INK} />
        <path d="M92 119v9M100 119v9M108 119v9" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// Pokémon : médaillon rond à quatre énergies (flamme, éclair, goutte d'eau, feuille), version simplifiée
export function EnergyEmblem({ size = 44, className = 'emblem' }) {
  const g = useIds();
  const quad = (a0, color) => { const [x0, y0] = pt(100, 100, 74, a0), [x1, y1] = pt(100, 100, 74, a0 + Math.PI / 2); return <path d={`M100 100L${x0} ${y0}A74 74 0 0 1 ${x1} ${y1}Z`} fill={color} />; };
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={className} aria-hidden="true">
      <defs><clipPath id={g('clip')}><circle cx="100" cy="100" r="74" /></clipPath></defs>
      <circle cx="100" cy="100" r="96" fill="#ffd23f" stroke={INK} strokeWidth="6" />
      <g clipPath={`url(#${g('clip')})`}>
        {quad(-Math.PI, '#ff7a5c')}{quad(-Math.PI / 2, '#ffe066')}{quad(0, '#7cd36b')}{quad(Math.PI / 2, '#6fb4ff')}
        <path d="M26 100h148M100 26v148" stroke={INK} strokeWidth="5" />
      </g>
      <circle cx="100" cy="100" r="74" fill="none" stroke={INK} strokeWidth="6" />
      <path d="M68 40c6 11 19 17 19 32 0 11-9 19-19 19s-19-8-19-19c0-9 5-15 9-20 1 6 4 9 7 10-2-8 0-16 3-22z" fill="#ff4a1c" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M140 40 118 74h13l-7 24 24-36h-14l8-22z" fill="#ffd23f" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <path d="M68 108C77 121 86 131 86 141c0 10-8 18-18 18s-18-8-18-18c0-10 9-20 18-33z" fill="#3aa0ff" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
      <g transform="translate(132 134) rotate(-35)">
        <path d="M0 -26C17 -17 20 4 0 26C-20 4 -17 -17 0 -26z" fill="#34b84a" stroke={INK} strokeWidth="5" strokeLinejoin="round" />
        <path d="M0 -18V24" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      </g>
      <circle cx="100" cy="100" r="11" fill="#ffffff" stroke={INK} strokeWidth="5" />
    </svg>
  );
}

// Illustration d'une extension sans logo : éventail de ses trois cartes les plus chères (ou ses premières cartes)
export function setArtCards(cards, d) {
  const priced = cards.map((c) => [eurOf(c, d.P, d.fx) || 0, c]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]).map((x) => x[1]);
  const withImg = (l) => l.filter((c) => c.image);
  const pick = withImg(priced).slice(0, 3);
  return pick.length >= 3 ? pick : withImg(cards).slice(0, 3);
}
export function SetArt({ cards, code, big, pack }) {
  const order = cards.length === 3 ? [cards[1], cards[0], cards[2]] : cards;
  const [packOk, setPackOk] = useState(true);
  return (
    <div className={'set-art' + (big ? ' big' : '') + (pack && packOk ? ' has-pack' : '')} aria-hidden="true">
      {pack && packOk && <><img className="sa-bg" src={pack} alt="" loading="lazy" referrerPolicy="no-referrer" /><img className="sa-pack" src={pack} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setPackOk(false)} /></>}
      {order.map((c, i) => <span key={c.key} className={'sa-card p' + (order.length === 3 ? i : 1)}><CardImage card={c} /></span>)}
      {code && <b className="sa-code">{code}</b>}
    </div>
  );
}

