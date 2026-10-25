import React, { useMemo, useState } from 'react';
import { useData, href, cardHref } from '../lib/hooks.js';
import { useStore } from '../lib/store.js';
import { fmtEur, fmtDate, fmtNum, eurOf, GAMES } from '../lib/data.js';
import { SearchBox, CardImage, Delta, Section, Seg, Icon, GameTag, Price, Loading, CardTile, SourceNote } from '../components.jsx';
import { collectionValue } from './Collection.jsx';

export function Podium({ game, setGame, limit = 10 }) {
  const { cats, M } = useData();
  const rows = useMemo(() => {
    const out = [];
    for (const g of Object.keys(cats)) {
      if (game !== 'all' && g !== game) continue;
      for (const [id, eur] of M?.games?.[g]?.podium || []) { const c = cats[g].byId.get(id); if (c) out.push({ c, eur }); }
    }
    return out.sort((a, b) => b.eur - a.eur).slice(0, limit);
  }, [cats, M, game]);
  if (!rows.length) return <p className="muted">Le podium apparaîtra après le premier relevé de prix.</p>;
  const [first, second, third] = rows;
  const step = (r, n) => r && (
    <a className={'step s' + n} href={cardHref(r.c)} key={r.c.key}>
      <div className="step-card"><CardImage card={r.c} eager />{n === 1 && <span className="crown" aria-hidden="true">♛</span>}</div>
      <div className="step-info"><b>{r.c.name}</b><small><GameTag game={r.c.game} /> {r.c.number}{r.c.variant ? ' · ' + r.c.variant : ''}</small><span className="step-price"><Price card={r.c} /></span></div>
      <div className="step-base"><span>{n}</span></div>
    </a>
  );
  return (
    <div className="podium-wrap">
      {setGame && <Seg value={game} onChange={setGame} label="Jeu" options={[['all', 'Tous'], ['onepiece', 'One Piece'], ['pokemon', 'Pokémon']]} />}
      <div className="podium">{step(second, 2)}{step(first, 1)}{step(third, 3)}</div>
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
      <p className="source-note">Seulement les cartes à 5 € et plus. {per === 'week' && Object.values(M?.games || {}).some((g) => g.weekNote?.startsWith('Moyenne')) && 'Pokémon : moyenne Cardmarket sur 7 jours comparée à celle sur 30 jours.'}</p>
    </div>
  );
}

export default function Home() {
  const d = useData();
  const [game, setGame] = useState('all');
  const coll = useStore((s) => s.collection);
  const watch = useStore((s) => s.watch);
  const recent = useStore((s) => s.recent);
  if (!d.ready) return <div className="page"><Hero /> {d.error ? <p className="error">Impossible de charger les données : {d.error}</p> : <Loading label="Chargement du catalogue et des prix…" />}</div>;
  const { cats, M } = d;
  const total = cats.onepiece.cards.length + cats.pokemon.cards.length;
  const priced = (M?.games?.onepiece?.priced || 0) + (M?.games?.pokemon?.priced || 0);
  const value = coll.length ? collectionValue(coll, d) : null;
  const recentCards = recent.map((k) => { const [g, ...r] = k.split(':'); return cats[g]?.byId.get(r.join(':')); }).filter(Boolean).slice(0, 6);
  return (
    <div className="page home">
      <Hero stats={{ total, priced, date: M?.updatedAt }} />

      {value && (
        <a className="my-coll-banner" href={href('/collection')}>
          <div><div className="kicker">Ma collection</div><b>{fmtEur(value.total)}</b><span>{fmtNum(value.count)} cartes · {value.priced} avec un prix</span></div>
          <span className="btn ghost">Ouvrir <Icon name="album" size={18} /></span>
        </a>
      )}

      <Section kicker="Prix relevés chaque jour" title="Le podium des cartes les plus chères" id="podium" action={<a className="link" href={href('/classement')}>Voir le top 100</a>}>
        <Podium game={game} setGame={setGame} />
      </Section>

      <Section kicker="Le marché bouge" title="Ce qui monte, ce qui baisse" id="mouvements" action={<a className="link" href={href('/suivis')}>Mes alertes</a>}>
        <Movers game={game} />
      </Section>

      <section className="features">
        <a className="feature scan" href={href('/scanner')}>
          <Icon name="scan" size={30} /><h3>Scanne ta carte</h3>
          <p>Photo ou caméra : on lit son numéro, on estime son état sur 10, et elle rejoint ta collection.</p><span className="link">Scanner une carte →</span>
        </a>
        <a className="feature packs" href={href('/boosters')}>
          <Icon name="pack" size={30} /><h3>Ouvre des boosters</h3>
          <p>Déchire le paquet, retourne les cartes une à une, et découvre la valeur réelle de ton tirage.</p><span className="link">Ouvrir un booster →</span>
        </a>
        <a className="feature compare" href={href('/comparateur')}>
          <Icon name="compare" size={30} /><h3>Compare les prix</h3>
          <p>Jusqu’à 4 cartes côte à côte : Cardmarket, TCGplayer, moyennes et courbes.</p><span className="link">Ouvrir le comparateur →</span>
        </a>
        <a className="feature album" href={href('/collection')}>
          <Icon name="album" size={30} /><h3>Ta collection, chiffrée</h3>
          <p>Valeur totale, état de chaque carte, progression par extension. Sans compte, gardée sur ton appareil.</p><span className="link">Voir ma collection →</span>
        </a>
      </section>

      {recentCards.length > 0 && (
        <Section kicker="Tu as regardé" title="Cartes récentes">
          <div className="grid tiles">{recentCards.map((c) => <CardTile key={c.key} card={c} compact />)}</div>
        </Section>
      )}

      <Section kicker="Deux jeux, un seul endroit" title="Parcourir les extensions">
        <div className="game-cards">
          {Object.values(GAMES).map((g) => {
            const sets = cats[g.id].setList.slice(0, 6);
            return (
              <div className={'game-card ' + g.id} key={g.id}>
                <h3>{g.label}<small>{fmtNum(cats[g.id].cards.length)} cartes · {cats[g.id].setList.length} extensions</small></h3>
                <ul>{sets.map((s) => <li key={s.code}><a href={href('/extension/' + g.id + '/' + encodeURIComponent(s.code))}><span>{s.name}</span><small>{s.code}</small></a></li>)}</ul>
                <a className="link" href={href('/extensions/' + g.id)}>Toutes les extensions →</a>
              </div>
            );
          })}
        </div>
      </Section>

      <Section kicker="Transparence" title="D’où viennent les prix ?" className="faq">
        <div className="faq-grid">
          <div><h3>One Piece</h3><p>Prix de marché TCGplayer, relevé chaque matin par optcgapi.com, converti en euros au taux du jour. Chaque version (standard, parallèle, réimpression) a son propre prix.</p><SourceNote game="onepiece" /></div>
          <div><h3>Pokémon</h3><p>Tendance Cardmarket en euros, avec les moyennes sur 1, 7 et 30 jours et le prix TCGplayer quand il existe.</p><SourceNote game="pokemon" /></div>
          <div><h3>Et si une carte n’a pas de prix ?</h3><p>On affiche « Pas de prix relevé ». Aucun prix n’est inventé ni estimé à partir d’une autre carte.</p></div>
          <div><h3>Mes données ?</h3><p>Ta collection, tes suivis et tes boosters restent dans ton navigateur. Tu peux les exporter à tout moment depuis ta collection.</p></div>
        </div>
      </Section>
    </div>
  );
}

function Hero({ stats }) {
  return (
    <section className="hero">
      <div className="hero-glow" aria-hidden="true" />
      <div className="hero-inner">
        <div className="kicker">One Piece TCG · Pokémon TCG</div>
        <h1>Combien vaut <em>vraiment</em> ta carte ?</h1>
        <p className="lead">Le prix du jour de plus de 25 000 cartes, sourcé et daté. Cherche, compare, suis les prix, scanne et range ta collection.</p>
        <SearchBox big />
        <div className="hero-chips">
          {['Luffy', 'Shanks', 'Dracaufeu', 'Pikachu', 'OP13-118', 'Mewtwo'].map((t) => <a key={t} href={href('/recherche?q=' + encodeURIComponent(t))} className="chip">{t}</a>)}
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
