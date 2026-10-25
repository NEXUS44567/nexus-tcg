import React, { useMemo, useState } from 'react';
import { useData, href } from '../lib/hooks.js';
import { update } from '../lib/store.js';
import { img, fmtEur, fmtNum } from '../lib/data.js';
import { Logo, PirateEmblem } from '../components.jsx';

const SIDES = {
  onepiece: { to: '/op', title: 'ONE PIECE', sub: 'CARD GAME', chips: ['Extensions et parallèles', 'L’équipage', 'Packs en Berrys', 'Ma collection'] },
  pokemon: { to: '/pk', title: 'POKÉMON', sub: 'TRADING CARD GAME', chips: ['Extensions', 'Pokédex', 'Packs en Pokéballs', 'Ma collection'] },
};

function Wheel() {
  return (
    <svg viewBox="0 0 120 120" className="emblem" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round">
        <circle cx="60" cy="60" r="30" />
        {Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <line key={i} x1={60 + Math.cos(a) * 12} y1={60 + Math.sin(a) * 12} x2={60 + Math.cos(a) * 52} y2={60 + Math.sin(a) * 52} />; })}
      </g>
      {Array.from({ length: 8 }, (_, i) => { const a = (i * Math.PI) / 4; return <circle key={i} cx={60 + Math.cos(a) * 54} cy={60 + Math.sin(a) * 54} r="6" fill="currentColor" />; })}
      <path d="M60 40 66 60 60 80 54 60z" fill="currentColor" />
    </svg>
  );
}
function Bolt() {
  return (
    <svg viewBox="0 0 120 120" className="emblem" aria-hidden="true">
      <path d="M60 8 105 34v52L60 112 15 86V34z" fill="none" stroke="currentColor" strokeWidth="7" strokeLinejoin="round" />
      <path d="M66 26 40 66h18l-6 30 28-42H62z" fill="currentColor" />
    </svg>
  );
}

export default function UniversePage() {
  const d = useData();
  const [hover, setHover] = useState(null);
  const top = useMemo(() => {
    if (!d.ready) return {};
    const out = {};
    for (const g of ['onepiece', 'pokemon']) {
      const ids = (d.M?.games?.[g]?.podium || []).slice(0, 3).map(([id, eur]) => ({ c: d.cats[g].byId.get(id), eur })).filter((x) => x.c);
      out[g] = { ids, count: d.cats[g].cards.length, priced: d.M?.games?.[g]?.priced || 0 };
    }
    return out;
  }, [d.ready]);
  const enter = (g) => update((s) => { s.universe = g; });
  return (
    <div className={'universe' + (hover ? ' hover-' + hover : '')}>
      <div className="uv-logo"><Logo /><span>NEXUS<small>TCG</small></span></div>
      {['onepiece', 'pokemon'].map((g) => {
        const S = SIDES[g];
        const t = top[g];
        return (
          <a key={g} href={href(S.to)} className={'uv-side ' + g} onPointerEnter={() => setHover(g)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(g)} onClick={() => enter(g)}>
            <div className="uv-bg" aria-hidden="true">{g === 'onepiece' ? <><i className="sail" /><i className="wave w1" /><i className="wave w2" /></> : <><i className="ball" /><i className="spark s1" /><i className="spark s2" /></>}</div>
            {t?.ids?.length > 0 && (
              <div className="uv-cards" aria-hidden="true">
                {t.ids.map((x, i) => <img key={x.c.key} src={img(x.c.image)} alt="" referrerPolicy="no-referrer" style={{ '--i': i }} onError={(e) => (e.currentTarget.style.display = 'none')} />)}
              </div>
            )}
            <div className="uv-content">
              {g === 'onepiece' ? <PirateEmblem size={110} /> : <Bolt />}
              <h2>{S.title}</h2>
              <span className="uv-sub">{S.sub}</span>
              <div className="uv-chips">{S.chips.map((c) => <span key={c}>{c}</span>)}</div>
              {t && <span className="uv-stats">{fmtNum(t.count)} cartes · {fmtNum(t.priced)} prix du jour{t.ids?.[0] ? ' · record ' + fmtEur(t.ids[0].eur) : ''}</span>}
              <span className="uv-enter">Entrer →</span>
            </div>
          </a>
        );
      })}
      <div className="uv-vs" aria-hidden="true"><span>VS</span></div>
      <div className="uv-pick">CHOISIS TON UNIVERS</div>
    </div>
  );
}
