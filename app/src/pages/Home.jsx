import React, { useMemo, useState } from 'react';
import { useData, href, cardHref } from '../lib/hooks.js';
import { useStore } from '../lib/store.js';
import { fmtEur, fmtDate, fmtNum, eurOf, GAMES, img } from '../lib/data.js';
import { SearchBox, CardImage, Delta, Section, Seg, Icon, GameTag, Price, Loading, CardTile, SourceNote, PirateEmblem, EnergyEmblem } from '../components.jsx';
import { collectionValue } from './Collection.jsx';
import Podium3D from './Podium3D.jsx';

export function Podium({ game, limit = 10 }) {
  const { cats, M } = useData();
  const rows = useMemo(() => {
    const out = [];
    for (const g of Object.keys(cats)) {
      if (game !== 'all' && g !== game) continue;
      for (const [id, eur] of M?.games?.[g]?.podium || []) { if (id.startsWith('jp-')) continue; const c = cats[g].byId.get(id); if (c) out.push({ c, eur }); }
    }
    return out.sort((a, b) => b.eur - a.eur).slice(0, limit);
  }, [cats, M, game]);
  if (!rows.length) return <p className="muted">Le podium apparaîtra après le premier relevé de prix.</p>;
  const [first, second, third] = rows;
  return (
    <div className="podium-wrap">
      <Podium3D first={first} second={second} third={third} />
      {rows.length > 3 && (
        <ol className="ranking" start={4}>
          {rows.slice(3).map((r, i) => (
            <li key={r.c.key}><a href={cardHref(r.c)}>
              <span className="pos">{i + 4}</span><CardImage card={r.c} className="mini" />
              <span className="r-name">{r.c.name}<small><GameTag game={r.c.game} /> {r.c.number}{r.c.variant ? ' · ' + r.c.variant : ''}</small></span>
              <Price card={r.c} />
            </a></li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function Movers({ game = 'all', limit = 6 }) {
  const { cats, M } = useData();
  const [dir, setDir] = useState('up');
  const [period, setPeriod] = useState(null);
  const avail = (p) => Object.keys(cats).some((g) => (game === 'all' || g === game) && (M?.games?.[g]?.[p]?.up?.length || M?.games?.[g]?.[p]?.down?.length));
  const per = period || (avail('day') ? 'day' : 'week');
  const rows = useMemo(() => {
    const out = [];
    for (const g of Object.keys(cats)) {
      if (game !== 'all' && g !== game) continue;
      for (const [id, from, to, pct] of M?.games?.[g]?.[per]?.[dir] || []) { const c = cats[g].byId.get(id); if (c) out.push({ c, from, to, pct }); }
    }
    return out.sort((a, b) => (dir === 'up' ? b.pct - a.pct : a.pct - b.pct)).slice(0, limit);
  }, [cats, M, dir, per, game]);
  return (
    <div className="movers">
      <div className="movers-bar">
        <Seg value={dir} onChange={setDir} label="Sens" options={[['up', '▲ Hausses'], ['down', '▼ Baisses']]} />
        <Seg value={per} onChange={setPeriod} label="Période" options={[['day', '24 h'], ['week', '7 jours']]} />
      </div>
      {rows.length === 0 ? (
        <p className="muted">{per === 'day' ? 'Les variations sur 24 h apparaissent dès le deuxième relevé quotidien.' : 'Pas encore assez de relevés pour cette période.'}</p>
      ) : (
        <div className="mover-list">
          {rows.map((r) => (
            <a key={r.c.key} className={'mover ' + dir} href={cardHref(r.c)}>
              <CardImage card={r.c} className="mini" />
              <span className="m-name">{r.c.name}<small><GameTag game={r.c.game} /> {r.c.number}</small></span>
              <span className="m-vals"><s>{fmtEur(r.from)}</s><b>{fmtEur(r.to)}</b></span>
              <Delta pct={r.pct} />
            </a>
          ))}
        </div>
      )}
      <p className="source-note">Seulement les cartes à 5 € et plus. {per === 'week' && game === 'pokemon' && M?.games?.pokemon?.weekNote?.startsWith('Moyenne') && 'Sur 7 jours : moyenne Cardmarket des 7 derniers jours comparée à celle des 30 derniers jours.'}</p>
    </div>
  );
}

const UNIV = {
  onepiece: {
    kicker: 'One Piece Card Game', title: <>Combien vaut <em>vraiment</em> ta carte One Piece ?</>,
    lead: 'Le prix du jour de chaque version, standard, parallèle ou manga, sourcé et daté. Cherche, compare, suis les prix, scanne et range ta collection.',
    chips: ['Luffy', 'Shanks', 'Zoro', 'Nami', 'OP13-118', 'Yamato'], placeholder: 'Cherche une carte : Luffy, Shanks, OP13-118…',
    world: { href: '/equipage', icon: 'crew', title: 'L’équipage', text: 'Plus de 700 personnages, chacun avec toutes ses cartes, ses parallèles et leur valeur du jour.', cta: 'Découvrir l’équipage →' },
    packs: 'Déchire un booster, retourne les cartes une à une, et découvre la valeur réelle de ton tirage. Les parallèles brillent.',
  },
  pokemon: {
    kicker: 'Pokémon Trading Card Game', title: <>Combien vaut <em>vraiment</em> ta carte Pokémon ?</>,
    lead: 'Le prix du jour de plus de 20 000 cartes, de Set de Base à aujourd’hui. Cherche en français ou en anglais, compare, suis les prix, scanne et range ta collection.',
    chips: ['Dracaufeu', 'Pikachu', 'Mewtwo', 'Évoli', 'Rayquaza', 'Lugia'], placeholder: 'Cherche une carte : Dracaufeu, Pikachu, 199/165…',
    world: { href: '/pokedex', icon: 'dex', title: 'Le Pokédex', text: 'Les 1 025 Pokémon : types, statistiques, évolutions, faiblesses et toutes leurs cartes avec leur prix.', cta: 'Ouvrir le Pokédex →' },
    packs: 'Déchire un booster, retourne les cartes une à une, et découvre la valeur réelle de ton tirage. Les illustrations rares brillent.',
  },
};

export default function Home({ game }) {
  const d = useData();
  const U = UNIV[game];
  const coll = useStore((s) => s.collection);
  const recent = useStore((s) => s.recent);
  if (!d.ready) return <div className="page"><Hero game={game} /> {d.error ? <p className="error">Impossible de charger les données : {d.error}</p> : <Loading label="Chargement du catalogue et des prix…" />}</div>;
  const { cats, M } = d;
  const total = cats[game].cards.length;
  const priced = M?.games?.[game]?.priced || 0;
  const mine = coll.filter((e) => e.key.startsWith(game + ':'));
  const value = mine.length ? collectionValue(mine, d) : null;
  const recentCards = recent.filter((k) => k.startsWith(game + ':')).map((k) => cats[game].byId.get(k.split(':').slice(1).join(':'))).filter(Boolean).slice(0, 6);
  const sets = cats[game].setList.slice(0, 8);
  return (
    <div className="page home">
      <Hero game={game} stats={{ total, priced, date: M?.updatedAt }} />

      {value && (
        <a className="my-coll-banner" href={href('/collection')}>
          <div><div className="kicker">Ma collection {GAMES[game].label}</div><b>{fmtEur(value.total)}</b><span>{fmtNum(value.count)} cartes · {value.priced} avec un prix</span></div>
          <span className="btn ghost">Ouvrir <Icon name="album" size={18} /></span>
        </a>
      )}

      <Section kicker="Prix relevés chaque jour" title="Le podium des cartes les plus chères" id="podium" action={<a className="link" href={href('/classement')}>Voir le top 100</a>}>
        <Podium game={game} />
      </Section>

      <Section kicker="Le marché bouge" title="Ce qui monte, ce qui baisse" id="mouvements" action={<a className="link" href={href('/suivis')}>Mes alertes</a>}>
        <Movers game={game} />
      </Section>

      <section className="features">
        <a className={'feature world ' + game} href={href(U.world.href)}>
          <Icon name={U.world.icon} size={30} /><h3>{U.world.title}</h3><p>{U.world.text}</p><span className="link">{U.world.cta}</span>
        </a>
        <a className="feature scan" href={href('/scanner')}>
          <Icon name="scan" size={30} /><h3>Scanne ta carte</h3>
          <p>Photo ou caméra : on lit son numéro, on estime son état sur 10, et elle rejoint ta collection.</p><span className="link">Scanner une carte →</span>
        </a>
        <a className="feature packs" href={href('/boosters')}>
          <Icon name="pack" size={30} /><h3>Ouvre des boosters</h3><p>{U.packs}</p><span className="link">Ouvrir un booster →</span>
        </a>
        <a className="feature compare" href={href('/comparateur')}>
          <Icon name="compare" size={30} /><h3>Compare les prix</h3>
          <p>Jusqu’à 4 cartes côte à côte : sources, moyennes et courbes.</p><span className="link">Ouvrir le comparateur →</span>
        </a>
      </section>

      {recentCards.length > 0 && (
        <Section kicker="Tu as regardé" title="Cartes récentes">
          <div className="grid tiles">{recentCards.map((c) => <CardTile key={c.key} card={c} compact />)}</div>
        </Section>
      )}

      <Section kicker={fmtNum(cats[game].setList.length) + ' extensions'} title="Les dernières extensions" action={<a className="link" href={href('/extensions/' + game)}>Toutes les extensions</a>}>
        <div className="set-grid">
          {sets.map((s) => (
            <a key={s.code} className="set-card" href={href('/extension/' + game + '/' + encodeURIComponent(s.code))}>
              {s.logo ? <img src={img(s.logo)} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.display = 'none')} /> : <span className="set-code">{s.code}</span>}
              <b>{s.name}</b><small>{s.code} · {s.count} cartes{s.date ? ' · ' + fmtDate(s.date, { month: 'short', year: 'numeric' }) : ''}</small>
            </a>
          ))}
        </div>
      </Section>

      <Section kicker="Transparence" title="D’où viennent les prix ?" className="faq">
        <div className="faq-grid">
          {game === 'onepiece'
            ? <div><h3>One Piece</h3><p>Prix de marché TCGplayer, relevé chaque matin par optcgapi.com. Chaque version (standard, parallèle, réimpression) a son propre prix.</p><SourceNote game="onepiece" /></div>
            : <div><h3>Pokémon</h3><p>Tendance Cardmarket, avec les moyennes sur 1, 7 et 30 jours et le prix TCGplayer quand il existe. Les cartes dont les deux sources divergent fortement sont signalées.</p><SourceNote game="pokemon" /></div>}
          <div><h3>Et si une carte n’a pas de prix ?</h3><p>On affiche « Pas de prix relevé ». Aucun prix n’est inventé ni estimé à partir d’une autre carte.</p></div>
          <div><h3>Mes données ?</h3><p>Ta collection, tes suivis et tes boosters restent dans ton navigateur. Tu peux les exporter à tout moment depuis ta collection.</p></div>
        </div>
      </Section>
    </div>
  );
}

function Hero({ game, stats }) {
  const U = UNIV[game];
  return (
    <section className={'hero ' + game}>
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-inner">
        <div className="hero-emblem">{game === 'onepiece' ? <PirateEmblem size={84} /> : <EnergyEmblem size={84} />}</div>
        <div className="kicker">{U.kicker}</div>
        <h1>{U.title}</h1>
        <p className="lead">{U.lead}</p>
        <SearchBox big placeholder={U.placeholder} />
        <div className="hero-chips">
          {U.chips.map((t) => <a key={t} href={href('/recherche?q=' + encodeURIComponent(t) + '&u=' + game)} className="chip">{t}</a>)}
        </div>
        {stats && (
          <dl className="hero-stats">
            <div><dt>Cartes</dt><dd>{fmtNum(stats.total)}</dd></div>
            <div><dt>Prix réels</dt><dd>{fmtNum(stats.priced)}</dd></div>
            <div><dt>Dernier relevé</dt><dd>{stats.date ? fmtDate(stats.date, { day: 'numeric', month: 'short' }) : '—'}</dd></div>
          </dl>
        )}
      </div>
    </section>
  );
}
