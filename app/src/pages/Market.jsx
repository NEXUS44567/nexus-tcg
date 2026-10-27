import React, { useMemo, useState } from 'react';
import { useData, useAsync, href, cardHref } from '../lib/hooks.js';
import { useStore, toggleCompare, toggleWatch, setAlert, getState, useUniverse } from '../lib/store.js';
import { CUR, toDisp, fromDisp, priceOf, eurOf, historyOf, search, fmtEur, fmtUsd, fmtDate, fmtNum, GAMES, img } from '../lib/data.js';
import { SetArt, setArtCards, CardImage, CardTile, PriceChart, SearchBox, Section, Loading, Empty, Icon, GameTag, Delta, Seg, Price, SourceNote, Sparkline } from '../components.jsx';
import { Podium } from './Home.jsx';

const COLORS = ['#ff7a45', '#4cc9f0', '#ffd23f', '#b388ff'];

// ---------- Recherche ----------
export function SearchPage({ query }) {
  const d = useData();
  const q = query.q || '';
  const universe = useUniverse();
  const game = query.u || universe;
  const [sort, setSort] = useState('pertinence');
  const [shown, setShown] = useState(60);
  const res = useMemo(() => (d.ready ? search(d.cats, q, { game, limit: 2000, P: d.P }) : []), [d.ready, d.jp, d.lang, q, game]);
  const sorted = useMemo(() => {
    if (sort === 'pertinence') return res;
    const v = (c) => eurOf(c, d.P, d.fx) ?? -1;
    return [...res].sort((a, b) => (sort === 'prix-desc' ? v(b) - v(a) : (v(a) < 0 ? 1e9 : v(a)) - (v(b) < 0 ? 1e9 : v(b))));
  }, [res, sort]);
  return (
    <div className="page">
      <h1 className="page-title">Recherche · {GAMES[game]?.label}</h1>
      <SearchBox initial={q} key={q} />
      {!d.ready ? <Loading /> : (
        <>
          <div className="toolbar">
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier"><option value="pertinence">Les plus pertinentes</option><option value="prix-desc">Prix décroissant</option><option value="prix-asc">Prix croissant</option></select>
            <span className="muted">{fmtNum(res.length)} résultat{res.length > 1 ? 's' : ''}{res.length >= 2000 ? ' (2 000 premiers)' : ''}</span>
          </div>
          {q && res.length === 0 && <Empty icon="search" title="Aucune carte trouvée">Essaie un nom anglais ou français, ou un numéro comme OP01-120 ou 4/102.</Empty>}
          <div className="grid tiles">{sorted.slice(0, shown).map((c) => <CardTile key={c.key} card={c} />)}</div>
          {sorted.length > shown && <div className="more"><button className="btn ghost" onClick={() => setShown(shown + 60)}>Afficher plus</button></div>}
        </>
      )}
    </div>
  );
}

// ---------- Comparateur ----------
export function ComparePage() {
  const d = useData();
  const keys = useStore((s) => s.compare);
  const cards = d.ready ? keys.map((k) => { const [g, ...r] = k.split(':'); return d.cats[g]?.byId.get(r.join(':')); }).filter(Boolean) : [];
  const hist = useAsync(() => Promise.all(cards.map((c) => historyOf(c))), [keys.join('|'), d.ready]);
  const [adding, setAdding] = useState(false);
  if (!d.ready) return <div className="page"><Loading /></div>;
  const rows = cards.map((c) => ({ c, p: priceOf(c, d.P), eur: eurOf(c, d.P, d.fx), set: d.cats[c.game].sets.get(c.set) }));
  const best = (f, dir = 'max') => { const v = rows.map(f).filter((x) => x != null); if (!v.length) return null; return dir === 'max' ? Math.max(...v) : Math.min(...v); };
  const lines = [
    ['Prix du jour', (r) => r.eur, fmtEur],
    ['Moyenne 7 jours', (r) => r.p?.avg7, fmtEur],
    ['Moyenne 30 jours', (r) => r.p?.avg30, fmtEur],
    ['Offre la plus basse', (r) => r.p?.low, fmtEur],
    ['TCGplayer (marché)', (r) => r.p?.usd, fmtUsd],
    ['Tendance 7 j / 30 j', (r) => (r.p?.avg7 && r.p?.avg30 ? ((r.p.avg7 - r.p.avg30) / r.p.avg30) * 100 : null), (v) => <Delta pct={v} />],
  ];
  return (
    <div className="page compare-page">
      <h1 className="page-title">Comparateur de prix</h1>
      <p className="lead">Jusqu’à 4 cartes côte à côte. Ajoute-les depuis leur fiche avec le bouton « Comparer », ou cherche-les ici.</p>
      {(adding || cards.length === 0) ? <div className="compare-add"><CompareSearch onPick={() => setAdding(false)} /></div> : cards.length < 4 && <button className="btn ghost" onClick={() => setAdding(true)}><Icon name="plus" size={18} />Ajouter une carte</button>}
      {cards.length > 0 && (
        <>
          <div className="compare-grid" style={{ '--cols': cards.length }}>
            <div className="cg-head" />
            {rows.map((r, i) => (
              <div className="cg-card" key={r.c.key} style={{ '--c': COLORS[i] }}>
                <button className="icon-btn rm" onClick={() => toggleCompare(r.c.key)} aria-label={'Retirer ' + r.c.name}><Icon name="x" size={16} /></button>
                <a href={cardHref(r.c)}><CardImage card={r.c} /></a>
                <b>{r.c.name}</b><small><GameTag game={r.c.game} /> {r.c.number}{r.c.variant ? ' · ' + r.c.variant : ''}</small><small className="muted">{r.set?.name}</small>
              </div>
            ))}
            {lines.map(([label, f, fmt]) => {
              const hi = best(f, 'max');
              return (
                <React.Fragment key={label}>
                  <div className="cg-label">{label}</div>
                  {rows.map((r) => { const v = f(r); return <div key={r.c.key} className={'cg-val' + (v != null && v === hi && rows.length > 1 && label === 'Prix du jour' ? ' top' : '')}>{v == null ? <span className="muted">—</span> : fmt(v)}</div>; })}
                </React.Fragment>
              );
            })}
            <div className="cg-label">Suivi</div>
            {rows.map((r) => <div key={r.c.key} className="cg-val"><WatchToggle card={r.c} eur={r.eur} /></div>)}
          </div>
          <Section kicker="Courbes" title="Évolution comparée">
            {hist.loading ? <Loading /> : <PriceChart height={260} series={rows.map((r, i) => ({ label: r.c.name, color: COLORS[i], points: hist.value?.[i] || [] }))} />}
            <div className="legend">{rows.map((r, i) => <span key={r.c.key}><i style={{ background: COLORS[i] }} />{r.c.name} {r.c.number}</span>)}</div>
          </Section>
        </>
      )}
    </div>
  );
}

function WatchToggle({ card, eur }) {
  const on = useStore((s) => !!s.watch[card.key]);
  return <button className={'btn small ' + (on ? 'on' : 'ghost')} onClick={() => toggleWatch(card.key, eur)}><Icon name="eye" size={16} />{on ? 'Suivie' : 'Suivre'}</button>;
}

function CompareSearch({ onPick }) {
  const d = useData();
  const [q, setQ] = useState('');
  const res = useMemo(() => (q.length >= 2 ? search(d.cats, q, { limit: 12, P: d.P }) : []), [q]);
  return (
    <div className="picker">
      <div className="searchbox"><Icon name="search" size={18} /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nom ou numéro de la carte à comparer" /></div>
      {res.length > 0 && <div className="grid tiles small">{res.map((c) => <CardTile key={c.key} card={c} compact onClick={() => { toggleCompare(c.key); setQ(''); onPick?.(); }} />)}</div>}
    </div>
  );
}

// ---------- Suivis et alertes ----------
export function checkAlerts(d) {
  const s = getState();
  const hits = [];
  for (const [key, w] of Object.entries(s.watch)) {
    const [g, ...r] = key.split(':');
    const c = d.cats[g]?.byId.get(r.join(':'));
    const eur = c && eurOf(c, d.P, d.fx);
    if (eur == null) continue;
    if (w.below != null && eur <= w.below) hits.push({ c, eur, kind: 'below', target: w.below });
    else if (w.above != null && eur >= w.above) hits.push({ c, eur, kind: 'above', target: w.above });
  }
  return hits;
}

export function WatchPage() {
  const d = useData();
  const watch = useStore((s) => s.watch);
  const [perm, setPerm] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'unsupported');
  if (!d.ready) return <div className="page"><Loading /></div>;
  const rows = Object.entries(watch).map(([key, w]) => { const [g, ...r] = key.split(':'); const c = d.cats[g]?.byId.get(r.join(':')); return c && { c, w, eur: eurOf(c, d.P, d.fx) }; }).filter(Boolean);
  const hits = new Set(checkAlerts(d).map((h) => h.c.key));
  return (
    <div className="page">
      <h1 className="page-title">Mes suivis et alertes</h1>
      <p className="lead">Suis une carte et fixe un seuil : à chaque relevé quotidien, NEXUS te signale les cartes qui passent sous ou au-dessus de ton prix.</p>
      {perm === 'default' && rows.length > 0 && <button className="btn ghost" onClick={() => Notification.requestPermission().then(setPerm)}><Icon name="bell" size={18} />Activer les notifications du navigateur</button>}
      {rows.length === 0 ? <Empty icon="eye" title="Aucune carte suivie" action={<a className="btn primary" href={href('/')}>Trouver une carte</a>}>Ouvre la fiche d’une carte et touche « Suivre le prix ».</Empty> : (
        <div className="watch-list">
          {rows.map(({ c, w, eur }) => {
            const ch = w.baseline && eur ? ((eur - w.baseline) / w.baseline) * 100 : null;
            return (
              <div key={c.key} className={'watch-row' + (hits.has(c.key) ? ' hit' : '')}>
                <a href={cardHref(c)}><CardImage card={c} className="mini" /></a>
                <a className="w-name" href={cardHref(c)}>{c.name}<small><GameTag game={c.game} /> {c.number}{c.variant ? ' · ' + c.variant : ''}</small></a>
                <div className="w-price"><Price card={c} />{ch != null && <small><Delta pct={ch} small /> depuis le suivi</small>}</div>
                <label className="w-th">Sous <input key={CUR.code} type="number" min="0" inputMode="decimal" defaultValue={w.below != null ? Math.round(toDisp(w.below) * 100) / 100 : ''} onBlur={(e) => setAlert(c.key, { below: e.target.value === '' ? null : fromDisp(+e.target.value) })} /> {CUR.sym}</label>
                <label className="w-th">Au-dessus <input key={CUR.code + 'a'} type="number" min="0" inputMode="decimal" defaultValue={w.above != null ? Math.round(toDisp(w.above) * 100) / 100 : ''} onBlur={(e) => setAlert(c.key, { above: e.target.value === '' ? null : fromDisp(+e.target.value) })} /> {CUR.sym}</label>
                {hits.has(c.key) && <span className="hit-badge"><Icon name="bell" size={14} />Seuil atteint</span>}
                <button className="icon-btn" onClick={() => toggleWatch(c.key)} aria-label="Ne plus suivre"><Icon name="trash" size={18} /></button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- Classement ----------
export function RankingPage() {
  const d = useData();
  const game = useUniverse();
  const [n, setN] = useState(100);
  const [ed, setEd] = useState('intl');
  const ja = game === 'pokemon' && ed === 'ja';
  const rows = useMemo(() => {
    if (!d.ready) return [];
    const out = [];
    for (const c of d.cats[game].cards) {
      if ((c.lang === 'ja') !== ja) continue;
      const e = eurOf(c, d.P, d.fx); if (e != null && priceOf(c, d.P)?.divergent !== true) out.push([e, c]);
    }
    return out.sort((a, b) => b[0] - a[0]).slice(0, n);
  }, [d.ready, d.jp, d.lang, game, n, ja]);
  if (!d.ready) return <div className="page"><Loading /></div>;
  const first = ja ? 1 : 4;
  return (
    <div className="page">
      <h1 className="page-title">Les cartes {GAMES[game].label} {ja ? 'japonaises ' : ''}les plus chères</h1>
      {game === 'pokemon' && <Seg value={ed} onChange={(v) => { setEd(v); setN(100); }} label="Édition" options={[['intl', 'Internationales (EN / FR)'], ['ja', 'Japonaises']]} />}
      {!ja && <Podium game={game} limit={3} />}
      {ja && !d.jp ? <Loading /> : (
        <ol className="ranking big" start={first}>
          {rows.slice(first - 1).map(([e, c], i) => (
            <li key={c.key}><a href={cardHref(c)}><span className="pos">{i + first}</span><CardImage card={c} className="mini" /><span className="r-name">{c.name}{c.lang === 'ja' && c.nameFr ? <em className="r-alt"> · {c.nameFr}</em> : null}<small><GameTag game={c.game} /> {c.number}{c.variant ? ' · ' + c.variant : ''} · {d.cats[c.game].sets.get(c.set)?.name}</small></span><Price card={c} /></a></li>
          ))}
        </ol>
      )}
      {n < 500 && <div className="more"><button className="btn ghost" onClick={() => setN(n + 100)}>Afficher 100 de plus</button></div>}
      <SourceNote game={game} ja={ja} />
    </div>
  );
}

// ---------- Extensions ----------
export function SetsPage({ game }) {
  const d = useData();
  const pref = useStore((s) => s.lang);
  const [tab, setTab] = useState(null);
  if (!d.ready) return <div className="page"><Loading /></div>;
  const g = d.cats[game];
  if (!g) return <div className="page"><Empty title="Jeu inconnu" /></div>;
  const owned = new Set(getState().collection.map((e) => e.key));
  const hasJa = game === 'pokemon' && g.setList.some((s) => s.lang === 'ja');
  const t = tab || (hasJa && pref === 'ja' ? 'ja' : 'intl');
  const list = g.setList.filter((s) => (t === 'ja' ? s.lang === 'ja' : s.lang !== 'ja'));
  return (
    <div className="page">
      <h1 className="page-title">Extensions {GAMES[game].label}</h1>
      {hasJa && <Seg value={t} onChange={setTab} label="Édition" options={[['intl', 'Internationales (EN / FR)'], ['ja', 'Japonaises']]} />}
      {game === 'pokemon' && !d.jp && <p className="muted small">Chargement des extensions japonaises…</p>}
      <div className="set-grid">
        {list.map((s) => {
          const cards = g.cards.filter((c) => c.set === s.code);
          const have = cards.filter((c) => owned.has(c.key)).length;
          const top = cards.reduce((m, c) => { const e = eurOf(c, d.P, d.fx) || 0; return e > m[0] ? [e, c] : m; }, [0, null]);
          const code = s.code.replace(/^jp-/, '');
          const art = s.logo ? null : setArtCards(cards, d);
          return (
            <a key={s.code} className={'set-card' + (s.lang === 'ja' ? ' ja' : '')} href={href('/extension/' + game + '/' + encodeURIComponent(s.code))}>
              {s.logo ? <img src={img(s.logo)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} />
                : art.length ? <SetArt cards={art} code={code} /> : <span className="set-code">{code}</span>}
              <b>{s.name}</b>
              <small>{s.lang === 'ja' ? 'JP · ' : ''}{code} · {s.count} cartes{s.date ? ' · ' + fmtDate(s.date, { month: 'short', year: 'numeric' }) : ''}</small>
              {top[1] && <small className="muted">Top : {top[1].name} · {fmtEur(top[0])}</small>}
              {have > 0 && <div className="progress"><i style={{ width: (have / s.count) * 100 + '%' }} /><span>{have}/{s.count}</span></div>}
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function SetPage({ game, code }) {
  const d = useData();
  const [sort, setSort] = useState('numero');
  const [shown, setShown] = useState(120);
  if (!d.ready) return <div className="page"><Loading /></div>;
  const g = d.cats[game]; const s = g?.sets.get(code);
  if (!s && String(code).startsWith('jp-') && !d.jp) return <div className="page"><Loading /></div>;
  if (!s) return <div className="page"><Empty title="Extension introuvable" /></div>;
  let cards = g.cards.filter((c) => c.set === code);
  const value = cards.reduce((t, c) => t + (eurOf(c, d.P, d.fx) || 0), 0);
  if (sort === 'prix') cards = [...cards].sort((a, b) => (eurOf(b, d.P, d.fx) || 0) - (eurOf(a, d.P, d.fx) || 0));
  return (
    <div className="page">
      <nav className="crumbs"><a href={href('/')}>Accueil</a><span>›</span><a href={href('/extensions/' + game)}>{GAMES[game].label}</a></nav>
      {!s.logo && <SetArt cards={setArtCards(cards, d)} big />}
      <h1 className="page-title">{s.name} <small className="muted">{s.lang === 'ja' ? 'JP · ' + s.code.slice(3) : s.code}</small></h1>
      <p className="muted">{s.count} cartes{s.date ? ' · sortie le ' + fmtDate(s.date) : ''} · valeur cumulée d’un exemplaire de chaque : {fmtEur(value)}</p>
      <div className="toolbar"><Seg value={sort} onChange={setSort} label="Tri" options={[['numero', 'Par numéro'], ['prix', 'Par prix']]} /></div>
      <div className="grid tiles">{cards.slice(0, shown).map((c) => <CardTile key={c.key} card={c} compact />)}</div>
      {cards.length > shown && <div className="more"><button className="btn ghost" onClick={() => setShown(shown + 120)}>Afficher plus</button></div>}
    </div>
  );
}
