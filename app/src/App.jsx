import React, { useEffect, useState } from 'react';
import { useRoute, useData, href, cardHref } from './lib/hooks.js';
import { useStore, update } from './lib/store.js';
import { fmtEur } from './lib/data.js';
import { Icon, SearchBox, Loading } from './components.jsx';
import Home from './pages/Home.jsx';
import CardPage from './pages/Card.jsx';
import CollectionPage from './pages/Collection.jsx';
import BoostersPage, { VirtualCollection } from './pages/Boosters.jsx';
import ScannerPage from './pages/Scanner.jsx';
import { SearchPage, ComparePage, WatchPage, RankingPage, SetsPage, SetPage, checkAlerts } from './pages/Market.jsx';

const NAV = [
  ['/', 'Accueil', 'home'],
  ['/comparateur', 'Comparer', 'compare'],
  ['/scanner', 'Scanner', 'scan'],
  ['/boosters', 'Boosters', 'pack'],
  ['/collection', 'Collection', 'album'],
];

export default function App() {
  const route = useRoute();
  const d = useData();
  const compare = useStore((s) => s.compare.length);
  const watchN = useStore((s) => Object.keys(s.watch).length);
  const [searchOpen, setSearchOpen] = useState(false);
  const p = route.parts;
  let page;
  switch (p[0]) {
    case undefined: page = <Home />; break;
    case 'carte': page = <CardPage cardKey={p[1] || ''} />; break;
    case 'recherche': page = <SearchPage query={route.query} />; break;
    case 'comparateur': page = <ComparePage />; break;
    case 'suivis': page = <WatchPage />; break;
    case 'classement': page = <RankingPage />; break;
    case 'extensions': page = <SetsPage game={p[1] || 'onepiece'} />; break;
    case 'extension': page = <SetPage game={p[1]} code={p[2]} />; break;
    case 'collection': page = <CollectionPage />; break;
    case 'boosters': page = p[1] === 'collection' ? <VirtualCollection /> : <BoostersPage />; break;
    case 'scanner': page = <ScannerPage />; break;
    default: page = <div className="page"><h1 className="page-title">Page introuvable</h1><a className="btn primary" href={href('/')}>Accueil</a></div>;
  }
  useEffect(() => { if (p[0] !== 'carte') document.title = 'NEXUS TCG · prix des cartes One Piece et Pokémon'; }, [route.path]);
  const active = (to) => (to === '/' ? route.path === '/' : route.path.startsWith(to));
  const isOpening = false;
  return (
    <>
      <a className="skip" href="#contenu">Aller au contenu</a>
      <header className="topbar">
        <a className="logo" href={href('/')} aria-label="NEXUS TCG, accueil"><Logo /><span>NEXUS<small>TCG</small></span></a>
        <nav className="topnav" aria-label="Navigation principale">
          {NAV.slice(1).map(([to, l, i]) => <a key={to} href={href(to)} className={active(to) ? 'on' : ''}><Icon name={i} size={18} />{l}{to === '/comparateur' && compare > 0 && <span className="badge">{compare}</span>}</a>)}
          <a href={href('/suivis')} className={active('/suivis') ? 'on' : ''}><Icon name="bell" size={18} />Alertes{watchN > 0 && <span className="badge">{watchN}</span>}</a>
        </nav>
        <div className="top-search">{route.path !== '/' && <SearchBox placeholder="Chercher une carte…" />}</div>
        <button className="icon-btn mobile-search" onClick={() => setSearchOpen(true)} aria-label="Rechercher"><Icon name="search" /></button>
      </header>
      {searchOpen && <div className="search-sheet" onPointerDown={(e) => e.target === e.currentTarget && setSearchOpen(false)}><div><SearchBox autoFocus onDone={() => setSearchOpen(false)} placeholder="Nom, numéro…" /><button className="btn ghost" onClick={() => setSearchOpen(false)}>Fermer</button></div></div>}
      {d.ready && <AlertBanner />}
      <main id="contenu">{page}</main>
      <footer className="footer">
        <div>
          <b>NEXUS TCG</b> · prix des cartes One Piece et Pokémon, relevés chaque jour.
          <p>Prix : TCGplayer via optcgapi.com (One Piece) et Cardmarket / TCGplayer via tcgdex (Pokémon). Images : optcgapi.com, pokemontcg.io, Scrydex. Site de fan indépendant, non affilié à Bandai, Toei Animation, Nintendo, Creatures, GAME FREAK ou The Pokémon Company. One Piece © Eiichiro Oda / Shueisha, Toei Animation. Pokémon © Nintendo / Creatures / GAME FREAK.</p>
        </div>
        <nav><a href={href('/classement')}>Top 100</a><a href={href('/extensions/onepiece')}>Extensions One Piece</a><a href={href('/extensions/pokemon')}>Extensions Pokémon</a><a href={href('/suivis')}>Alertes</a><a href={href('/boosters/collection')}>Collection virtuelle</a></nav>
      </footer>
      <nav className="tabbar" aria-label="Navigation">
        {NAV.map(([to, l, i]) => <a key={to} href={href(to)} className={active(to) ? 'on' : ''}><Icon name={i} size={22} /><span>{l}</span></a>)}
      </nav>
    </>
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
