import React, { useEffect, useMemo, useState } from 'react';
import { useData, useAsync, href, cardHref, useRoute } from '../lib/hooks.js';
import { useStore } from '../lib/store.js';
import { equipageData, eurOf, fmtEur, fmtNum, img, normalize, OP_COLORS } from '../lib/data.js';
import { CardImage, CardTile, Loading, Empty, Icon, Section, Seg } from '../components.jsx';
import { useTilt } from './Card.jsx';

const TRAIT_FR = {}; // rempli depuis les affiliations du fichier

function useCrew() {
  const d = useData();
  return useAsync(async () => {
    const j = await equipageData();
    for (const [id, label] of j.affiliations) TRAIT_FR[id] = label;
    const members = j.members.map(([slug, name, leader, colors, traits, attributes, image, cards, versions, power, cost, numbers]) => ({ slug, name, leader: !!leader, colors, traits, attributes, image, cards, versions, power, cost, numbers, q: normalize(name) }));
    return { ...j, members, bySlug: new Map(members.map((m) => [m.slug, m])) };
  }, []);
}

// Toutes les versions (standard, parallèles, réimpressions) des cartes d'un personnage
function memberCards(m, d) {
  if (!d.ready) return [];
  const nums = new Set(m.numbers);
  return d.cats.onepiece.cards.filter((c) => nums.has(c.number));
}

export const traitLabel = (t) => TRAIT_FR[t] || t;
const Dots = ({ colors }) => <span className="op-dots">{colors.map((c) => <i key={c} title={OP_COLORS[c]?.[0] || c} style={{ background: OP_COLORS[c]?.[1] || '#888' }} />)}</span>;

export default function EquipagePage() {
  const d = useData();
  const C = useCrew();
  const coll = useStore((s) => s.collection);
  const [q, setQ] = useState('');
  const route = useRoute();
  const [aff, setAff] = useState(route.query.aff || '');
  const [color, setColor] = useState('');
  const [role, setRole] = useState('all');
  const [sort, setSort] = useState('valeur');
  const [shown, setShown] = useState(80);
  const values = useMemo(() => {
    if (!C.value || !d.ready) return new Map();
    const byNum = new Map();
    for (const c of d.cats.onepiece.cards) { const e = eurOf(c, d.P, d.fx); if (e != null && e > (byNum.get(c.number) || 0)) byNum.set(c.number, e); }
    return new Map(C.value.members.map((m) => [m.slug, Math.max(0, ...m.numbers.map((n) => byNum.get(n) || 0))]));
  }, [C.value, d.ready]);
  const ownedNums = useMemo(() => {
    if (!d.ready) return new Set();
    return new Set(coll.filter((e) => e.key.startsWith('onepiece:')).map((e) => d.cats.onepiece.byId.get(e.key.slice(9))?.number).filter(Boolean));
  }, [coll, d.ready]);
  const list = useMemo(() => {
    if (!C.value) return [];
    const t = normalize(q);
    let r = C.value.members.filter((m) => (!t || m.q.includes(t)) && (!aff || m.traits.includes(aff)) && (!color || m.colors.includes(color)) && (role === 'all' || (role === 'leader') === m.leader));
    if (sort === 'valeur') r = [...r].sort((a, b) => (values.get(b.slug) || 0) - (values.get(a.slug) || 0));
    if (sort === 'cartes') r = [...r].sort((a, b) => b.versions - a.versions);
    if (sort === 'nom') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [C.value, q, aff, color, role, sort, values]);
  useEffect(() => setShown(80), [q, aff, color, role, sort]);
  if (C.loading) return <div className="page"><Loading label="L’équipage embarque…" /></div>;
  if (C.error) return <div className="page"><p className="error">Équipage indisponible.</p></div>;
  const totalCards = C.value.members.reduce((s, m) => s + m.cards, 0);
  return (
    <div className="page crew-page">
      <div className="kicker">One Piece TCG</div>
      <h1 className="page-title">L’équipage</h1>
      <p className="lead">{fmtNum(C.value.members.length)} personnages et {fmtNum(totalCards)} cartes Leader et Personnage. Chaque fiche réunit toutes les cartes d’un personnage, parallèles comprises, avec leur prix du jour.</p>
      <div className="crew-filters">
        <div className="searchbox"><Icon name="search" size={18} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Luffy, Zoro, Nami…" aria-label="Chercher un personnage" /></div>
        <div className="toolbar">
          <select value={aff} onChange={(e) => setAff(e.target.value)} aria-label="Affiliation"><option value="">Toutes les affiliations</option>{C.value.affiliations.map(([id, label, n]) => <option key={id} value={id}>{label} ({n})</option>)}</select>
          <div className="color-chips">
            <button className={'cchip' + (!color ? ' on' : '')} onClick={() => setColor('')}>Toutes</button>
            {Object.entries(OP_COLORS).map(([k, [fr, hex]]) => <button key={k} className={'cchip' + (color === k ? ' on' : '')} style={{ '--c': hex }} onClick={() => setColor(color === k ? '' : k)}><i />{fr}</button>)}
          </div>
          <Seg value={role} onChange={setRole} label="Rôle" options={[['all', 'Tous'], ['leader', 'Leaders'], ['perso', 'Personnages']]} />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier"><option value="valeur">Carte la plus chère</option><option value="cartes">Nombre de versions</option><option value="nom">Nom</option></select>
          <span className="muted">{fmtNum(list.length)} personnage{list.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      {list.length === 0 ? <Empty icon="crew" title="Personne à bord">Change les filtres ou la recherche.</Empty> : (
        <div className="crew-grid">
          {list.slice(0, shown).map((m) => {
            const v = values.get(m.slug) || 0;
            const have = m.numbers.filter((n) => ownedNums.has(n)).length;
            return (
              <a key={m.slug} href={href('/equipage/' + m.slug)} className="crew-tile">
                <div className="ct-img"><img src={img('@o/' + m.image + '.jpg')} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} />{m.leader && <span className="leader">Leader</span>}</div>
                <div className="ct-body">
                  <b>{m.name}</b>
                  <small>{m.traits.slice(0, 2).map(traitLabel).join(' · ')}</small>
                  <span className="ct-meta"><Dots colors={m.colors} /><span>{m.versions} version{m.versions > 1 ? 's' : ''}</span>{have > 0 && <span className="ct-have">{have}/{m.cards}</span>}</span>
                  {v > 0 && <span className="ct-val">jusqu’à {fmtEur(v)}</span>}
                </div>
              </a>
            );
          })}
        </div>
      )}
      {list.length > shown && <div className="more"><button className="btn ghost" onClick={() => setShown(shown + 80)}>Afficher plus</button></div>}
      <p className="source-note">Source : {C.value.source}. One Piece © Eiichiro Oda / Shueisha, Toei Animation, Bandai.</p>
    </div>
  );
}

export function MemberPage({ slug }) {
  const d = useData();
  const C = useCrew();
  const coll = useStore((s) => s.collection);
  const [filter, setFilter] = useState('all');
  const tilt = useTilt();
  const m = C.value?.bySlug.get(slug);
  useEffect(() => { if (m) document.title = m.name + ' · L’équipage · NEXUS TCG'; }, [m]);
  if (C.loading || !d.ready) return <div className="page"><Loading /></div>;
  if (!m) return <div className="page"><Empty icon="crew" title="Personnage introuvable" action={<a className="btn primary" href={href('/equipage')}>Retour à l’équipage</a>} /></div>;
  const cards = memberCards(m, d);
  const priced = cards.map((c) => [eurOf(c, d.P, d.fx), c]).sort((a, b) => (b[0] ?? -1) - (a[0] ?? -1));
  const best = priced.find((x) => x[0] != null);
  const sumAll = priced.reduce((s, x) => s + (x[0] || 0), 0);
  const ownedKeys = new Set(coll.map((e) => e.key));
  const have = cards.filter((c) => ownedKeys.has(c.key)).length;
  const shown = priced.map((x) => x[1]).filter((c) => filter === 'all' || (filter === 'std' ? !c.variant : !!c.variant));
  const par = cards.filter((c) => c.variant).length;
  const hero = best?.[1] || cards[0];
  const related = C.value.members.filter((x) => x.slug !== m.slug && x.traits.includes(m.traits[0])).sort((a, b) => b.versions - a.versions).slice(0, 12);
  const range = (r, unit = '') => (r ? (r[0] === r[1] ? fmtNum(r[0]) : fmtNum(r[0]) + ' à ' + fmtNum(r[1])) + unit : '—');
  return (
    <div className="page member-page" data-game="onepiece">
      <nav className="crumbs"><a href={href('/op')}>One Piece TCG</a><span>›</span><a href={href('/equipage')}>L’équipage</a></nav>
      <div className="card-hero">
        <div className="card-visual">{hero && <div className="tilt" ref={tilt}><CardImage card={hero} size="large" eager /><span className="shine" /></div>}</div>
        <div className="card-info">
          <div className="card-tags">{m.leader && <span className="tag variant">Leader</span>}<Dots colors={m.colors} /></div>
          <h1>{m.name}</h1>
          <div className="trait-chips">{m.traits.map((t) => <a key={t} className="chip" href={href('/equipage?aff=' + encodeURIComponent(t))}>{traitLabel(t)}</a>)}</div>
          <dl className="member-facts">
            <div><dt>Cartes</dt><dd>{m.cards}</dd></div>
            <div><dt>Versions</dt><dd>{cards.length}{par ? <small> dont {par} parallèle{par > 1 ? 's' : ''} ou réimpression{par > 1 ? 's' : ''}</small> : null}</dd></div>
            <div><dt>Couleurs</dt><dd>{m.colors.map((c) => OP_COLORS[c]?.[0] || c).join(', ')}</dd></div>
            <div><dt>Attribut</dt><dd>{m.attributes.map((a) => C.value.attributes[a] || a).join(', ') || '—'}</dd></div>
            <div><dt>Puissance</dt><dd>{range(m.power)}</dd></div>
            <div><dt>Coût</dt><dd>{range(m.cost)}</dd></div>
          </dl>
          <div className="pk-cards-sum">
            <div><span>Dans ta collection</span><b>{have} / {cards.length}</b></div>
            {best && <a href={cardHref(best[1])}><span>Sa carte la plus chère</span><b>{fmtEur(best[0])}</b><small>{best[1].number}{best[1].variant ? ' · ' + best[1].variant : ''}</small></a>}
            <div><span>Toutes ses versions</span><b>{fmtEur(sumAll)}</b><small>un exemplaire de chaque</small></div>
          </div>
        </div>
      </div>
      <Section kicker={cards.length + ' versions'} title={'Les cartes de ' + m.name} action={<Seg value={filter} onChange={setFilter} label="Versions" options={[['all', 'Toutes'], ['std', 'Standard'], ['par', 'Parallèles']]} />}>
        <div className="grid tiles">{shown.map((c) => <CardTile key={c.key} card={c} />)}</div>
      </Section>
      {related.length > 0 && (
        <Section kicker={traitLabel(m.traits[0])} title="Le reste de l’équipage">
          <div className="crew-grid small">
            {related.map((x) => (
              <a key={x.slug} href={href('/equipage/' + x.slug)} className="crew-tile">
                <div className="ct-img"><img src={img('@o/' + x.image + '.jpg')} alt="" loading="lazy" referrerPolicy="no-referrer" onError={(e) => (e.currentTarget.style.visibility = 'hidden')} /></div>
                <div className="ct-body"><b>{x.name}</b><span className="ct-meta"><Dots colors={x.colors} /><span>{x.versions} versions</span></span></div>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
