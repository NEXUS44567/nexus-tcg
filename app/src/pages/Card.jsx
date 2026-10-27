import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData, useAsync, href, cardHref } from '../lib/hooks.js';
import { useStore, addToCollection, setAlert, pushRecent, CONDITIONS } from '../lib/store.js';
import { priceOf, eurOf, historyOf, fmtEur, fmtUsd, fmtDate, fmtPct, normalize, GAMES } from '../lib/data.js';
import { CardImage, LangTag, PriceChart, WatchButton, CompareButton, Icon, GameTag, Delta, Loading, Empty, CardTile, Section, SourceNote, Seg } from '../components.jsx';

export function useTilt() {
  const ref = useRef();
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const move = (e) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      el.style.setProperty('--rx', ((0.5 - y) * 16).toFixed(2) + 'deg');
      el.style.setProperty('--ry', ((x - 0.5) * 20).toFixed(2) + 'deg');
      el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      el.classList.add('tilting');
    };
    const leave = () => { el.classList.remove('tilting'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); };
    el.addEventListener('pointermove', move); el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  }, []);
  return ref;
}

export default function CardPage({ cardKey }) {
  const d = useData();
  const card = useMemo(() => {
    if (!d.ready) return null;
    const [g, ...r] = cardKey.split(':');
    return d.cats[g]?.byId.get(r.join(':')) || null;
  }, [d.ready, d.jp, cardKey]);
  useEffect(() => { if (card) { pushRecent(card.key); document.title = card.name + ' ' + card.number + ' · prix · NEXUS TCG'; } }, [card, d.lang]);
  const hist = useAsync(() => (card ? historyOf(card) : []), [card?.key]);
  const tilt = useTilt();
  if (!d.ready || (!card && cardKey.includes(':jp-') && !d.jp)) return <div className="page"><Loading /></div>;
  if (!card) return <div className="page"><Empty icon="search" title="Carte introuvable" action={<a className="btn primary" href={href('/')}>Retour à l’accueil</a>}>Cette carte n’est pas dans le catalogue.</Empty></div>;

  const { cats, P, fx } = d;
  const set = cats[card.game].sets.get(card.set);
  const p = priceOf(card, P);
  const eur = eurOf(card, P, fx);
  const points = hist.value || [];
  const first = points[0]?.[1], last = points.at(-1)?.[1];
  const change = first && last && points.length > 1 ? ((last - first) / first) * 100 : null;
  const siblings = cats[card.game].cards.filter((c) => c.number === card.number && c.set === card.set && c.id !== card.id);
  const alsoName = card.game === 'onepiece' ? cats[card.game].cards.filter((c) => c.name === card.name && c.number !== card.number) : [];
  const others = [...siblings, ...alsoName.sort((a, b) => (eurOf(b, P, fx) || 0) - (eurOf(a, P, fx) || 0))].slice(0, 12);
  const enName = card.en?.name || card.nameEn || card.name;
  const cmQuery = encodeURIComponent(enName + ' ' + (card.game === 'onepiece' ? card.number : ''));
  const priceLabel = card.lang === 'ja' ? 'Prix du jour · Cardmarket, version japonaise'
    : card.game === 'onepiece' ? 'Prix TCGplayer de la version anglaise, converti en euros'
    : p?.converted ? 'Prix TCGplayer converti en euros (toutes langues)' : 'Prix du jour · Cardmarket, toutes langues confondues';
  const scopeNote = card.lang === 'ja' ? 'Prix des exemplaires japonais vendus sur Cardmarket (Europe), pas celui des boutiques au Japon.'
    : card.game === 'onepiece' ? 'Ce prix est celui de la version anglaise : il n’existe pas de relevé gratuit des prix français ou japonais.'
    : 'Cardmarket regroupe toutes les langues (français, anglais, allemand…) dans un même prix : il n’existe pas de relevé gratuit propre à la version française.';
  const links = card.game === 'onepiece'
    ? [['Cardmarket', `https://www.cardmarket.com/fr/OnePiece/Products/Search?searchString=${encodeURIComponent(card.number)}`], ['TCGplayer', `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent(card.number)}`], ['eBay', `https://www.ebay.fr/sch/i.html?_nkw=${cmQuery}+one+piece`]]
    : card.lang === 'ja'
      ? [['Cardmarket', `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(card.nameEn || card.name)}`], ['eBay', `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent((card.nameEn || card.name) + ' ' + card.number + ' japanese')}`]]
      : [['Cardmarket', `https://www.cardmarket.com/fr/Pokemon/Products/Search?searchString=${encodeURIComponent(enName)}`], ['TCGplayer', `https://www.tcgplayer.com/search/pokemon/product?q=${encodeURIComponent(enName + ' ' + (set?.en?.name || set?.name || ''))}`], ['eBay', `https://www.ebay.fr/sch/i.html?_nkw=${encodeURIComponent(enName + ' ' + card.number + ' ' + (set?.en?.name || set?.name || ''))}`]];

  return (
    <div className="page card-page" data-game={card.game}>
      <nav className="crumbs"><a href={href('/')}>Accueil</a><span>›</span><a href={href('/extensions/' + card.game)}>{GAMES[card.game].label}</a><span>›</span><a href={href('/extension/' + card.game + '/' + encodeURIComponent(card.set))}>{set?.name}</a></nav>
      <div className="card-hero">
        <div className="card-visual">
          <div className="tilt" ref={tilt}><CardImage card={card} size="large" eager /><span className="shine" /></div>
        </div>
        <div className="card-info">
          <div className="card-tags"><GameTag game={card.game} /><LangTag card={card} /><span className="tag">{card.number}</span>{card.rarity && <span className="tag">{card.rarity}</span>}{card.variant && <span className="tag variant">{card.variant}</span>}</div>
          <h1>{card.name}{card.lang === 'ja' ? (card.nameFr && <small className="fr"> · {card.nameFr}</small>)
            : card.local && card.en?.name !== card.name ? <small className="fr"> · {card.en.name}</small>
            : card.nameFr && card.nameFr !== card.name && <small className="fr"> · {card.nameFr}</small>}</h1>
          <p className="muted">{set?.name}{set?.date ? ' · ' + fmtDate(set.date, { month: 'long', year: 'numeric' }) : ''}{card.type ? ' · ' + card.type : ''}</p>

          <div className="price-box">
            <div className="pb-main">
              <span className="pb-label">{priceLabel}</span>
              <span className="pb-value">{eur != null ? <>{p?.converted && <span className="approx">≈</span>}{fmtEur(eur)}</> : 'Pas de prix relevé'}</span>
              {change != null && <span className="pb-change"><Delta pct={change} /> depuis le {fmtDate(points[0][0], { day: 'numeric', month: 'short' })}</span>}
            </div>
            {p && (
              <dl className="pb-grid">
                {card.game === 'onepiece' || card.lang === 'ja' ? card.lang === 'ja' ? <>
                  <div><dt>Moyenne 7 jours</dt><dd>{fmtEur(p.avg7)}</dd></div>
                  <div><dt>Moyenne 30 jours</dt><dd>{fmtEur(p.avg30)}</dd></div>
                  <div><dt>Offre la plus basse</dt><dd>{fmtEur(p.low)}</dd></div>
                </> : <>
                  <div><dt>TCGplayer · marché</dt><dd>{fmtUsd(p.usd)}</dd></div>
                </> : <>
                  <div><dt>Moyenne 1 jour</dt><dd>{fmtEur(p.avg1)}</dd></div>
                  <div><dt>Moyenne 7 jours</dt><dd>{fmtEur(p.avg7)}</dd></div>
                  <div><dt>Moyenne 30 jours</dt><dd>{fmtEur(p.avg30)}</dd></div>
                  <div><dt>Offre la plus basse</dt><dd>{fmtEur(p.low)}</dd></div>
                  <div><dt>TCGplayer · marché</dt><dd>{fmtUsd(p.usd)}</dd></div>
                </>}
              </dl>
            )}
            {p?.divergent && <p className="warn-note"><Icon name="bell" size={16} />Cardmarket et TCGplayer donnent des prix très différents pour cette carte (impression ou version mal distinguée par les sources). Vérifie les offres avant d’acheter ou de vendre.</p>}
            <p className="scope-note"><Icon name="bell" size={14} />{scopeNote}</p>
            <SourceNote game={card.game} ja={card.lang === 'ja'} />
          </div>

          <div className="actions">
            <AddButton card={card} />
            <WatchButton card={card} baseline={eur} />
            <CompareButton card={card} />
          </div>
          <AlertEditor card={card} eur={eur} />
          <div className="ext-links">Voir les offres : {links.map(([l, u]) => <a key={l} href={u} target="_blank" rel="noreferrer">{l} <Icon name="ext" size={14} /></a>)}</div>
        </div>
      </div>

      <Section kicker="Historique" title="Évolution du prix">
        {hist.loading ? <Loading /> : <PriceChart series={[{ points, color: 'var(--accent)' }]} empty={points.length === 1 ? `Premier relevé le ${fmtDate(points[0][0])} à ${fmtEur(points[0][1])}. La courbe se dessine dès demain.` : undefined} />}
        {card.game === 'pokemon' && p?.avg30 && <AvgBars p={p} />}
      </Section>

      {eur != null && <ConditionTable eur={eur} />}

      {others.length > 0 && (
        <Section kicker={siblings.length ? 'Autres versions' : 'Même personnage'} title={siblings.length ? 'Les autres versions de cette carte' : 'Autres cartes de ' + card.name}>
          <div className="grid tiles">{others.map((c) => <CardTile key={c.key} card={c} compact />)}</div>
        </Section>
      )}
    </div>
  );
}

function AvgBars({ p }) {
  const rows = [['30 jours', p.avg30], ['7 jours', p.avg7], ['1 jour', p.avg1], ['Aujourd’hui', p.eur]].filter((r) => r[1]);
  const max = Math.max(...rows.map((r) => r[1]));
  return (
    <div className="avg-bars">
      <h3>Moyennes Cardmarket</h3>
      {rows.map(([l, v]) => <div key={l} className="ab"><span>{l}</span><div><i style={{ width: (v / max) * 100 + '%' }} /></div><b>{fmtEur(v)}</b></div>)}
    </div>
  );
}

function ConditionTable({ eur }) {
  return (
    <Section kicker="Selon l’état" title="Ce que vaut ta carte selon son état">
      <div className="cond-table">
        {CONDITIONS.map((c) => (
          <div key={c.id} className={'cond c-' + c.id}><b>{c.short}</b><span>{c.label}<small>{c.hint}</small></span><em>{fmtEur(eur * c.factor)}</em></div>
        ))}
      </div>
      <p className="source-note">Estimation NEXUS : le prix du jour (état Near Mint) multiplié par un coefficient d’usure courant sur le marché. Ce n’est pas un prix relevé.</p>
    </Section>
  );
}

function AddButton({ card }) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(1);
  const [cond, setCond] = useState('NM');
  const pref = useStore((s) => s.lang);
  const [lang, setLang] = useState(card.lang === 'ja' ? 'jp' : pref === 'fr' ? 'fr' : pref === 'ja' ? 'jp' : 'en');
  const [done, setDone] = useState(false);
  const owned = useStore((s) => s.collection.filter((e) => e.key === card.key).reduce((n, e) => n + e.qty, 0));
  if (!open) return <button className="btn primary" onClick={() => { setOpen(true); setDone(false); }}><Icon name="plus" size={18} />{owned ? `Dans ta collection (${owned})` : 'Ajouter à ma collection'}</button>;
  return (
    <div className="add-panel">
      <div className="ap-row"><span>Quantité</span><div className="stepper"><button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Moins"><Icon name="minus" size={16} /></button><b>{qty}</b><button onClick={() => setQty(qty + 1)} aria-label="Plus"><Icon name="plus" size={16} /></button></div></div>
      <div className="ap-row"><span>État</span><select value={cond} onChange={(e) => setCond(e.target.value)}>{CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.short} · {c.label}</option>)}</select></div>
      <div className="ap-row"><span>Langue</span><Seg value={lang} onChange={setLang} label="Langue" options={[['en', 'Anglais'], ['fr', 'Français'], ['jp', 'Japonais']]} /></div>
      {card.lang === 'ja' ? (lang !== 'jp' && <p className="source-note">Cette fiche est celle de la carte japonaise.</p>)
        : card.game === 'onepiece' ? (lang !== 'en' && <p className="source-note">Le prix utilisé est celui de la version anglaise : pas de relevé gratuit des prix {lang === 'fr' ? 'français' : 'japonais'}.</p>)
        : lang === 'jp' ? <p className="source-note">Pour une carte japonaise, ajoute plutôt sa fiche japonaise (choisis JP en haut de l’écran) : son prix est relevé à part.</p>
        : <p className="source-note">Prix Cardmarket toutes langues confondues.</p>}
      <div className="ap-actions">
        <button className="btn ghost" onClick={() => setOpen(false)}>Annuler</button>
        <button className="btn primary" onClick={() => { addToCollection(card.key, { qty, cond, lang }); setDone(true); setTimeout(() => setOpen(false), 900); }}>{done ? <><Icon name="check" size={18} />Ajoutée</> : 'Ajouter'}</button>
      </div>
    </div>
  );
}

function AlertEditor({ card, eur }) {
  const w = useStore((s) => s.watch[card.key]);
  const [below, setBelow] = useState(w?.below ?? '');
  const [above, setAbove] = useState(w?.above ?? '');
  useEffect(() => { setBelow(w?.below ?? ''); setAbove(w?.above ?? ''); }, [w?.below, w?.above]);
  if (!w) return null;
  const save = () => setAlert(card.key, { below: below === '' ? null : +below, above: above === '' ? null : +above, baseline: w.baseline ?? eur });
  return (
    <div className="alert-editor">
      <Icon name="bell" size={18} />
      <label>Préviens-moi sous <input type="number" min="0" step="0.5" inputMode="decimal" value={below} onChange={(e) => setBelow(e.target.value)} onBlur={save} placeholder={eur ? Math.round(eur * 0.9) : ''} /> €</label>
      <label>ou au-dessus de <input type="number" min="0" step="0.5" inputMode="decimal" value={above} onChange={(e) => setAbove(e.target.value)} onBlur={save} placeholder={eur ? Math.round(eur * 1.1) : ''} /> €</label>
      <small>Vérifié à chaque relevé quotidien, quand tu ouvres NEXUS.</small>
    </div>
  );
}
