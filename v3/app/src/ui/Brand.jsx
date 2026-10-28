import React, { useId } from 'react';

// ---- Identité NEXUS V3 : logo prisme, emblèmes originaux des deux univers, dos de carte ----
// Aucun logo officiel : la boussole-gouvernail (One Piece) et le noyau d'énergie (Pokémon) sont dessinés pour NEXUS.
const useIds = () => { const id = useId().replace(/[^a-z0-9]/gi, ''); return (n) => `${n}${id}`; };

export function LogoMark({ size = 36, className = '' }) {
  const g = useIds();
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} className={'logo-mark ' + className} aria-hidden="true">
      <defs>
        <linearGradient id={g('t')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" style={{ stopColor: 'var(--l1, #fff)' }} /><stop offset="1" style={{ stopColor: 'var(--a2)' }} /></linearGradient>
        <linearGradient id={g('l')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--a1)' }} /><stop offset="1" style={{ stopColor: 'var(--a1d, var(--a1))' }} /></linearGradient>
        <linearGradient id={g('r')} x1="1" y1="0" x2="0" y2="1"><stop offset="0" style={{ stopColor: 'var(--a3)' }} /><stop offset="1" style={{ stopColor: 'var(--a1d, #222)' }} /></linearGradient>
        <linearGradient id={g('e')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#fff" stopOpacity=".55" /></linearGradient>
      </defs>
      <path d="M32 3 57 17.5 32 32 7 17.5z" fill={`url(#${g('t')})`} />
      <path d="M7 17.5 32 32v29L7 46.5z" fill={`url(#${g('l')})`} />
      <path d="M57 17.5v29L32 61V32z" fill={`url(#${g('r')})`} />
      <path d="M32 3 57 17.5v29L32 61 7 46.5v-29z" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20.5 43.5V23.2L43.5 40.8V20.5" fill="none" stroke="rgba(0,0,0,.35)" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" transform="translate(0 1.6)" />
      <path d="M20.5 43.5V23.2L43.5 40.8V20.5" fill="none" stroke={`url(#${g('e')})`} strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Logo({ size = 34, tag = true }) {
  return (
    <span className="logo">
      <LogoMark size={size} />
      <span className="logo-word">NEXUS{tag && <small>TCG</small>}</span>
    </span>
  );
}

// Boussole-gouvernail du Grand Line
export function OPEmblem({ size = 64, className = '' }) {
  const g = useIds();
  const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
  const star = (r1, r2, rot = -Math.PI / 2) => Array.from({ length: 16 }, (_, k) => { const a = rot + (k * Math.PI) / 8; const r = k % 4 === 0 ? r1 : k % 2 === 0 ? r2 : r2 * 0.38; return [60 + Math.cos(a) * r, 60 + Math.sin(a) * r]; });
  const pts = star(40, 25);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={'emblem ' + className} aria-hidden="true">
      <defs>
        <radialGradient id={g('bg')} cx=".5" cy=".42" r=".6"><stop offset="0" stopColor="#173763" /><stop offset="1" stopColor="#081428" /></radialGradient>
        <linearGradient id={g('gold')} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff1b8" /><stop offset=".45" stopColor="#ffc94a" /><stop offset="1" stopColor="#b9771b" /></linearGradient>
        <linearGradient id={g('red')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ff7a6b" /><stop offset="1" stopColor="#c81e2c" /></linearGradient>
      </defs>
      <g stroke={`url(#${g('gold')})`} strokeWidth="5.5" strokeLinecap="round">
        {spokes.map((a, i) => <line key={i} x1={60 + Math.cos(a) * 30} y1={60 + Math.sin(a) * 30} x2={60 + Math.cos(a) * 54} y2={60 + Math.sin(a) * 54} />)}
      </g>
      {spokes.map((a, i) => <circle key={i} cx={60 + Math.cos(a) * 54} cy={60 + Math.sin(a) * 54} r="5.6" fill={`url(#${g('gold')})`} stroke="#5a3a0c" strokeWidth="1" />)}
      <circle cx="60" cy="60" r="44" fill={`url(#${g('bg')})`} stroke={`url(#${g('gold')})`} strokeWidth="5" />
      <circle cx="60" cy="60" r="37" fill="none" stroke="#ffc94a" strokeOpacity=".35" strokeWidth="1" strokeDasharray="2 4" />
      {pts.map((p, k) => {
        if (k % 2) return null;
        const prev = pts[(k + 15) % 16], next = pts[(k + 1) % 16];
        return <g key={k}><path d={`M60 60L${prev[0]} ${prev[1]}L${p[0]} ${p[1]}z`} fill={k % 4 === 0 ? `url(#${g('red')})` : '#ffe9a8'} opacity={k % 4 === 0 ? 1 : 0.9} /><path d={`M60 60L${p[0]} ${p[1]}L${next[0]} ${next[1]}z`} fill={k % 4 === 0 ? '#8e1420' : '#c99a33'} /></g>;
      })}
      <circle cx="60" cy="60" r="6" fill={`url(#${g('gold')})`} stroke="#5a3a0c" strokeWidth="1.2" />
    </svg>
  );
}

// Noyau d'énergie électrique
export function PKEmblem({ size = 64, className = '' }) {
  const g = useIds();
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} className={'emblem ' + className} aria-hidden="true">
      <defs>
        <radialGradient id={g('orb')} cx=".38" cy=".32" r=".75"><stop offset="0" stopColor="#8fb6ff" /><stop offset=".45" stopColor="#3d6dff" /><stop offset="1" stopColor="#141f6e" /></radialGradient>
        <linearGradient id={g('bolt')} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffbd1" /><stop offset=".4" stopColor="#ffe14a" /><stop offset="1" stopColor="#ffab00" /></linearGradient>
        <radialGradient id={g('glow')} cx=".5" cy=".5" r=".5"><stop offset="0" stopColor="#ffe14a" stopOpacity=".55" /><stop offset="1" stopColor="#ffe14a" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${g('glow')})`} />
      <ellipse cx="60" cy="60" rx="55" ry="20" fill="none" stroke="#ffe14a" strokeOpacity=".7" strokeWidth="2.4" transform="rotate(-28 60 60)" />
      <ellipse cx="60" cy="60" rx="55" ry="20" fill="none" stroke="#7fa6ff" strokeOpacity=".8" strokeWidth="2.4" transform="rotate(28 60 60)" />
      <circle cx="60" cy="60" r="36" fill={`url(#${g('orb')})`} stroke="#0b1240" strokeWidth="3" />
      <ellipse cx="49" cy="44" rx="13" ry="7" fill="#fff" opacity=".28" transform="rotate(-30 49 44)" />
      <path d="M66 30 42 66h15l-6 26 27-38H62z" fill={`url(#${g('bolt')})`} stroke="#3a2600" strokeWidth="3.2" strokeLinejoin="round" />
      <circle cx="108" cy="38" r="3" fill="#ffe14a" /><circle cx="14" cy="80" r="2.4" fill="#9dc0ff" /><circle cx="98" cy="96" r="2" fill="#fff" />
    </svg>
  );
}

export const Emblem = ({ game, size = 64, className }) => (game === 'onepiece' ? <OPEmblem size={size} className={className} /> : <PKEmblem size={size} className={className} />);

// Dos des cartes NEXUS (boosters, inspecteur)
export function CardBack({ game }) {
  return (
    <span className={'card-back cb-' + game} aria-hidden="true">
      <span className="cb-frame" />
      <span className="cb-pattern" />
      <span className="cb-center"><Emblem game={game} size={120} /><b>NEXUS</b></span>
    </span>
  );
}
