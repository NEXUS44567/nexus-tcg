import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useRoute, useData, href, cardHref, UNIV_HOME } from './lib/hooks.js';
import { useStore, update, useUniverse, tryAdmin } from './lib/store.js';
import { fmtEur, GAMES } from './lib/data.js';
import { Icon, SearchBox, Logo, PirateEmblem, EnergyEmblem } from './components.jsx';
import Home from './pages/Home.jsx';
import CardPage from './pages/Card.jsx';
import CollectionPage from './pages/Collection.jsx';
import BoostersPage, { VirtualCollection, ShopPage } from './pages/Boosters.jsx';
import ScannerPage from './pages/Scanner.jsx';
import UniversePage from './pages/Universe.jsx';
import PokedexPage, { PokemonPage } from './pages/Pokedex.jsx';
import EquipagePage, { MemberPage } from './pages/Equipage.jsx';
import { SearchPage, ComparePage, WatchPage, RankingPage, SetsPage, SetPage, checkAlerts } from './pages/Market.jsx';

const NAVS = {
  onepiece: [['/op', 'Accueil', 'home'], ['/equipage', 'Équipage', 'crew'], ['/scanner', 'Scanner', 'scan'], ['/boosters', 'Boosters', 'pack'], ['/collection', 'Collection', 'album']],
  pokemon: [['/pk', 'Accueil', 'home'], ['/pokedex', 'Pokédex', 'dex'], ['/scanner', 'Scanner', 'scan'], ['/boosters', 'Boosters', 'pack'], ['/collection', 'Collection', 'album']],
};

export default function App() {
  const route = useRoute();
  const d = useData();
  const universe = useUniverse();
  const compare = useStore((s) => s.compare.length);
  const watchN = useStore((s) => Object.keys(s.watch).length);
  const last = useStore((s) => s.universe);
  const [searchOpen, setSearchOpen] = useState(false);
  const topRef = useRef(null), tabRef = useRef(null);
  const p = route.parts;
  const isChooser = p.length === 0;

  useEffect(() => { if (!isChooser && last !== universe) update((s) => { s.universe = universe; }); }, [universe, isChooser]);
  useEffect(() => { document.documentElement.dataset.universe = isChooser ? 'choice' : universe; }, [universe, isChooser]);
  useEffect(() => { if (!['carte', 'pokedex', 'equipage'].includes(p[0]) || !p[1]) document.title = isChooser ? 'NEXUS TCG · choisis ton univers' : `NEXUS TCG · ${GAMES[universe].label} · prix, collection et boosters`; }, [route.path, universe]);

  let page;
  switch (p[0]) {
    case undefined: page = <UniversePage />; break;
    case 'op': page = <Home game="onepiece" key="op" />; break;
    case 'pk': page = <Home game="pokemon" key="pk" />; break;
    case 'carte': page = <CardPage cardKey={p[1] || ''} />; break;
    case 'recherche': page = <SearchPage query={route.query} />; break;
    case 'comparateur': page = <ComparePage />; break;
    case 'suivis': page = <WatchPage />; break;
    case 'classement': page = <RankingPage />; break;
    case 'extensions': page = <SetsPage game={p[1] || universe} />; break;
    case 'extension': page = <SetPage game={p[1]} code={p[2]} />; break;
    case 'collection': page = <CollectionPage key={universe} />; break;
    case 'boosters': page = p[1] === 'collection' ? <VirtualCollection key={universe} /> : <BoostersPage key={universe} />; break;
    case 'admin': page = <AdminPage code={p[1] || ''} />; break;
    case 'boutique': page = <ShopPage key={universe} />; break;
    case 'scanner': page = <ScannerPage />; break;
    case 'pokedex': page = p[1] ? <PokemonPage id={p[1]} /> : <PokedexPage />; break;
    case 'equipage': page = p[1] ? <MemberPage slug={p[1]} /> : <EquipagePage />; break;
    default: page = <div className="page"><h1 className="page-title">Page introuvable</h1><a className="btn primary" href={href('/')}>Accueil</a></div>;
  }
  if (isChooser) return <main id="contenu" className="chooser-main">{page}</main>;

  const nav = NAVS[universe];
  const other = universe === 'onepiece' ? 'pokemon' : 'onepiece';
  const active = (to) => (to === UNIV_HOME[universe] ? route.path === to : route.path.startsWith(to));
  return (
    <div className={'shell u-' + universe} data-game={universe}>
      <a className="skip" href="#contenu">Aller au contenu</a>
      <header className="topbar">
        <a className="logo" href={href('/')} aria-label="NEXUS TCG, changer d’univers"><Logo /><span>NEXUS<small>TCG</small></span></a>
        <a className={'univ-pill ' + universe} href={href(UNIV_HOME[universe])}>{universe === 'onepiece' ? <PirateEmblem size={20} className="" /> : <EnergyEmblem size={20} className="" />} {GAMES[universe].label}</a>
        <nav className="topnav" aria-label="Navigation principale" ref={topRef}>
          <NavBolt navRef={topRef} edge="bottom" path={route.path} />
          {nav.slice(1).map(([to, l, i]) => <a key={to} href={href(to)} className={active(to) ? 'on' : ''}><Icon name={i} size={18} />{l}</a>)}
          <a href={href('/comparateur')} className={active('/comparateur') ? 'on' : ''}><Icon name="compare" size={18} />Comparer{compare > 0 && <span className="badge">{compare}</span>}</a>
          <a href={href('/suivis')} className={active('/suivis') ? 'on' : ''}><Icon name="bell" size={18} />Alertes{watchN > 0 && <span className="badge">{watchN}</span>}</a>
        </nav>
        <div className="top-search">{!active(UNIV_HOME[universe]) && <SearchBox placeholder={'Chercher une carte ' + GAMES[universe].label + '…'} />}</div>
        <a className="icon-btn switch" href={href(UNIV_HOME[other])} title={'Passer à ' + GAMES[other].label} aria-label={'Passer à ' + GAMES[other].label} onClick={() => update((s) => { s.universe = other; })}><Icon name="swap" /></a>
        <button className="icon-btn mobile-search" onClick={() => setSearchOpen(true)} aria-label="Rechercher"><Icon name="search" /></button>
      </header>
      {searchOpen && <div className="search-sheet" onPointerDown={(e) => e.target === e.currentTarget && setSearchOpen(false)}><div><SearchBox autoFocus onDone={() => setSearchOpen(false)} placeholder={'Carte ' + GAMES[universe].label + ' : nom, numéro…'} /><button className="btn ghost" onClick={() => setSearchOpen(false)}>Fermer</button></div></div>}
      {d.ready && <AlertBanner />}
      <main id="contenu">{page}</main>
      <footer className="footer">
        <div>
          <b>NEXUS TCG</b> · prix des cartes One Piece et Pokémon, relevés chaque jour.
          <p>Prix : TCGplayer via optcgapi.com (One Piece) et Cardmarket / TCGplayer via tcgdex (Pokémon). Pokédex : PokéAPI. Images : optcgapi.com, pokemontcg.io, Scrydex, PokéAPI sprites. Illustrations des boosters © Bandai et © The Pokémon Company. Site de fan indépendant, non affilié à Bandai, Toei Animation, Nintendo, Creatures, GAME FREAK ou The Pokémon Company. One Piece © Eiichiro Oda / Shueisha, Toei Animation. Pokémon © Nintendo / Creatures / GAME FREAK.</p>
        </div>
        <nav>
          <a href={href('/')}>Changer d’univers</a>
          <a href={href('/classement')}>Top 100</a>
          <a href={href('/extensions/' + universe)}>Extensions</a>
          {universe === 'onepiece' ? <a href={href('/equipage')}>L’équipage</a> : <a href={href('/pokedex')}>Pokédex</a>}
          <a href={href('/comparateur')}>Comparateur</a>
          <a href={href('/suivis')}>Alertes</a>
          <a href={href('/boosters/collection')}>Collection virtuelle</a>
        </nav>
      </footer>
      <nav className="tabbar" aria-label="Navigation" ref={tabRef}>
        <NavBolt navRef={tabRef} edge="top" path={route.path} />
        {nav.map(([to, l, i]) => <a key={to} href={href(to)} className={active(to) ? 'on' : ''}><Icon name={i} size={22} /><span>{l}</span></a>)}
      </nav>
    </div>
  );
}

function AlertBanner() {
  const d = useData();
  const notified = useStore((s) => s.notified);
  const [hits] = useState(() => checkAlerts(d));
  const date = d.M?.updatedAt?.slice(0, 10);
  const fresh = hits.filter((h) => notified[h.c.key] !== date);
  useEffect(() => {
    if (!fresh.length) return;
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      try { new Notification('NEXUS TCG · seuil atteint', { body: fresh.slice(0, 3).map((h) => `${h.c.name} : ${fmtEur(h.eur)}`).join('\n'), icon: 'icon-192.png' }); } catch {}
    }
  }, []);
  if (!fresh.length) return null;
  const dismiss = () => update((s) => { for (const h of fresh) s.notified[h.c.key] = date; });
  return (
    <div className="alert-banner" role="status">
      <Icon name="bell" />
      <span><b>{fresh.length} alerte{fresh.length > 1 ? 's' : ''} de prix</b> : {fresh.slice(0, 2).map((h, i) => <a key={h.c.key} href={cardHref(h.c)}>{i ? ', ' : ''}{h.c.name} à {fmtEur(h.eur)} ({h.kind === 'below' ? 'sous' : 'au-dessus de'} {fmtEur(h.target)})</a>)}{fresh.length > 2 ? '…' : ''}</span>
      <a className="btn small ghost" href={href('/suivis')}>Voir</a>
      <button className="icon-btn" onClick={dismiss} aria-label="Masquer"><Icon name="x" size={16} /></button>
    </div>
  );
}

function AdminPage({ code }) {
  const [res, setRes] = useState(null);
  const admin = useStore((s) => !!s.admin);
  useEffect(() => { tryAdmin(code).then(setRes); }, [code]);
  return (
    <div className="page">
      <h1 className="page-title">Mode administrateur</h1>
      {res === null && <p className="muted">Vérification…</p>}
      {res === 'bad' && <p className="error">Lien non valide.</p>}
      {res !== null && res !== 'bad' && (
        <>
          <p className="lead">{admin ? 'Activé sur cet appareil : Berrys et Pokéballs illimités pour ouvrir autant de boosters et de displays que tu veux.' : 'Désactivé sur cet appareil : tu retrouves ton solde normal.'}</p>
          <div className="row">
            <a className="btn primary" href={href('/op')} onClick={() => update((s) => { s.universe = 'onepiece'; })}>Boosters One Piece</a>
            <a className="btn primary pk" href={href('/pk')} onClick={() => update((s) => { s.universe = 'pokemon'; })}>Boosters Pokémon</a>
            {admin && <a className="btn ghost" href={href('/admin/off')}>Désactiver le mode administrateur</a>}
          </div>
        </>
      )}
    </div>
  );
}

// Petit éclair qui file de l'ancienne section à la nouvelle dans la barre de navigation (V1)
function boltPath(a, b) {
  const n = Math.max(4, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / 12));
  const pts = [a]; let sgn = Math.random() < 0.5 ? 1 : -1;
  for (let i = 1; i < n; i++) { if (Math.random() < 0.8) sgn = -sgn; const t = (i + (Math.random() - 0.5) * 0.4) / n; const off = sgn * (1.5 + Math.random() * 2.5); pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + off }); }
  pts.push(b);
  const f = (v) => v.toFixed(1);
  let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) { const m = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 }; d += ` Q${f(pts[i].x)} ${f(pts[i].y)} ${f(m.x)} ${f(m.y)}`; }
  return d + ` L${f(b.x)} ${f(b.y)}`;
}
function NavBolt({ navRef, edge, path }) {
  const last = useRef(null);
  const [bolt, setBolt] = useState(null);
  useLayoutEffect(() => {
    let raf = 0, tries = 0, timer = 0;
    const run = () => {
      const nav = navRef.current, link = nav?.querySelector('a.on'), r = nav?.getBoundingClientRect();
      if (!nav || !r || !r.width || !link) { if (++tries < 60) raf = requestAnimationFrame(run); else if (!link) last.current = null; return; }
      const b = link.getBoundingClientRect();
      const pos = { x: b.left - r.left + b.width / 2, y: edge === 'top' ? 3 : r.height - 3 };
      const prev = last.current; last.current = pos;
      if (!prev || Math.abs(prev.x - pos.x) < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const key = Date.now();
      setBolt({ d: boltPath(prev, pos), end: pos, key });
      timer = setTimeout(() => setBolt((x) => (x?.key === key ? null : x)), 900);
    };
    run();
    return () => { cancelAnimationFrame(raf); clearTimeout(timer); };
  }, [path]);
  if (!bolt) return null;
  return (
    <svg className="nav-bolt" aria-hidden="true" key={bolt.key}>
      <path className="bolt-glow" d={bolt.d} pathLength="1" />
      <path className="bolt-red" d={bolt.d} pathLength="1" />
      <path className="bolt-core" d={bolt.d} pathLength="1" />
      <circle className="bolt-spark" cx={bolt.end.x} cy={bolt.end.y} r="2.4" />
    </svg>
  );
}
