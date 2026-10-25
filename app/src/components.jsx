import React, { useEffect, useMemo, useRef, useState } from 'react';
import { img, priceOf, eurOf, fmtEur, fmtUsd, fmtPct, fmtDate, search, GAMES } from './lib/data.js';
import { useData, href, cardHref, go } from './lib/hooks.js';
import { useStore, toggleWatch, toggleCompare, useUniverse } from './lib/store.js';

export function Icon({ name, size = 20 }) {
  const p = {
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
    home: <><path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><rect x="8" y="7" width="8" height="10" rx="1" /></>,
    pack: <><path d="M6 3h12l-1 3H7z" /><rect x="5" y="6" width="14" height="15" rx="2" /><path d="M9 11h6M9 15h4" /></>,
    album: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M9 4v16M15 4v16M3 12h18" /></>,
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
    crew: <><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" /><path d="M12 2v5M12 17v5M2 12h5M17 12h5M4.9 4.9l3.5 3.5M15.6 15.6l3.5 3.5M4.9 19.1l3.5-3.5M15.6 8.4l3.5-3.5" /></>,
    dex: <><circle cx="12" cy="12" r="9" /><path d="M3 12h6M15 12h6" /><circle cx="12" cy="12" r="3" /></>,
    swap: <><path d="M7 4 3 8l4 4" /><path d="M3 8h13a4 4 0 0 1 4 4" /><path d="m17 20 4-4-4-4" /><path d="M21 16H8a4 4 0 0 1-4-4" /></>,
  }[name];
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p}</svg>;
}

export function CardImage({ card, size = 'small', className = '', eager = false, alt }) {
  const [state, setState] = useState('loading');
  const src = img(card?.image, size);
  return (
    <div className={'cimg ' + className + ' ' + state} data-game={card?.game}>
      {src && state !== 'error' && <img src={src} alt={alt ?? (card ? card.name + ' ' + card.number : '')} loading={eager ? 'eager' : 'lazy'} decoding="async" referrerPolicy="no-referrer" onLoad={() => setState('ok')} onError={() => setState('error')} />}
      {state === 'error' && <div className="cimg-fallback"><span>{card?.name}</span><small>{card?.number}</small></div>}
    </div>
  );
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
    <span className={'price' + (big ? ' big' : '')} title={p.converted ? 'Prix TCGplayer en dollars converti en euros' : 'Prix Cardmarket'}>
      {p.converted && <span className="approx">≈</span>}{fmtEur(eur)}
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
        <div className="tile-meta"><GameTag game={card.game} /> <span>{card.number}</span>{card.variant && <span className="variant">{card.variant}</span>}</div>
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

export function SourceNote({ game }) {
  const { P, M } = useData();
  const g = M?.games?.[game];
  const s = P?.[game]?.source;
  if (!s) return <p className="source-note">Prix pas encore relevés pour ce jeu.</p>;
  return (
    <p className="source-note">
      Source : <a href={s.url} target="_blank" rel="noreferrer">{s.name}</a> · relevé du {fmtDate(P[game].updatedAt)}
      {game === 'onepiece' && s.fx && <> · converti au taux {s.fx.usdEur.toLocaleString('fr-FR', { maximumFractionDigits: 4 })} € pour 1 $ ({s.fx.source})</>}
      {g && <> · {g.priced.toLocaleString('fr-FR')} cartes avec un prix</>}
    </p>
  );
}

export { fmtEur, fmtUsd, fmtPct, fmtDate };

export function Logo() {
  return (
    <svg viewBox="0 0 40 40" width="34" height="34" aria-hidden="true">
      <defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ff5a3c" /><stop offset=".5" stopColor="#ffcb05" /><stop offset="1" stopColor="#4cc9f0" /></linearGradient></defs>
      <rect x="9" y="4" width="20" height="28" rx="3" transform="rotate(-12 19 18)" fill="none" stroke="url(#lg)" strokeWidth="2.5" />
      <rect x="12" y="8" width="20" height="28" rx="3" transform="rotate(8 22 22)" fill="url(#lg)" opacity=".9" />
      <path d="M17 27V15l8 12V15" stroke="#0b0e1a" strokeWidth="2.6" fill="none" strokeLinecap="round" strokeLinejoin="round" transform="rotate(8 22 22)" />
    </svg>
  );
}
