import React, { useMemo, useRef, useState } from 'react';
import { useData, useAsync, href, cardHref } from '../lib/hooks.js';
import { useStore, updateEntry, removeEntry, CONDITIONS, condOf, exportData, importData, useUniverse } from '../lib/store.js';
import { UNIV_HOME } from '../lib/hooks.js';
import { eurOf, history, fmtEur, fmtDate, fmtNum, fmtPct, GAMES } from '../lib/data.js';
import { ShowBinder, ShareModal, coverOf } from './Binder.jsx';
import { CardImage, PriceChart, Section, Loading, Empty, Icon, GameTag, Delta, Seg, Modal, Price } from '../components.jsx';

export function resolve(d, key) { const [g, ...r] = key.split(':'); return d.cats?.[g]?.byId.get(r.join(':')) || null; }

export function collectionValue(coll, d) {
  let total = 0, totalNM = 0, count = 0, priced = 0, paid = 0, best = null;
  const keys = new Set();
  for (const e of coll) {
    const c = resolve(d, e.key); if (!c) continue;
    count += e.qty; keys.add(e.key);
    if (e.paid) paid += e.paid * e.qty;
    const eur = eurOf(c, d.P, d.fx);
    if (eur == null) continue;
    priced += e.qty;
    const v = eur * condOf(e.cond).factor * e.qty;
    total += v; totalNM += eur * e.qty;
    if (!best || eur > best.eur) best = { c, eur };
  }
  return { total, totalNM, count, unique: keys.size, priced, paid, best };
}

export default function CollectionPage() {
  const d = useData();
  const game = useUniverse();
  const allColl = useStore((s) => s.collection);
  const coll = useMemo(() => allColl.filter((e) => e.key.startsWith(game + ':')), [allColl, game]);
  const other = game === 'onepiece' ? 'pokemon' : 'onepiece';
  const otherCount = allColl.length - coll.length;
  const allVirtual = useStore((s) => s.packs.virtual);
  const virtual = useMemo(() => Object.fromEntries(Object.entries(allVirtual).filter(([k]) => k.startsWith(game + ':'))), [allVirtual, game]);
  const [view, setView] = useState('classeur');
  const [sort, setSort] = useState('valeur');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState(null);
  const [msg, setMsg] = useState('');
  const [sharing, setSharing] = useState(false);
  const binder = useStore((s) => s.binder);
  const file = useRef();

  const items = useMemo(() => {
    if (!d.ready) return [];
    let list = coll.map((e) => ({ e, c: resolve(d, e.key) })).filter((x) => x.c);
    if (game !== 'all') list = list.filter((x) => x.c.game === game);
    if (q.trim()) { const t = q.toLowerCase(); list = list.filter((x) => (x.c.name + ' ' + x.c.nameFr + ' ' + x.c.number).toLowerCase().includes(t)); }
    const val = (x) => (eurOf(x.c, d.P, d.fx) || 0) * condOf(x.e.cond).factor;
    const sorters = { valeur: (a, b) => val(b) - val(a), recent: (a, b) => b.e.addedAt.localeCompare(a.e.addedAt), nom: (a, b) => a.c.name.localeCompare(b.c.name), extension: (a, b) => a.c.set.localeCompare(b.c.set) || a.c.number.localeCompare(b.c.number, 'fr', { numeric: true }) };
    return list.sort(sorters[sort]);
  }, [d.ready, d.jp, d.lang, coll, game, sort, q]);

  const histSets = useMemo(() => [...new Set(coll.map((e) => { const c = d.ready && resolve(d, e.key); return c ? c.game + '/' + c.set : null; }).filter(Boolean))], [coll, d.ready]);
  const valueHist = useAsync(async () => {
    if (!d.ready || !coll.length) return [];
    const hs = await Promise.all(histSets.map((k) => { const [g, s] = k.split('/'); return history(g, s).then((h) => [k, h]); }));
    const map = new Map(hs);
    const byDate = new Map();
    for (const e of coll) {
      const c = resolve(d, e.key); if (!c) continue;
      const h = map.get(c.game + '/' + c.set); const s = h?.p[c.id]; if (!s) continue;
      const f = condOf(e.cond).factor * e.qty;
      h.d.forEach((dt, i) => { if (s[i] != null) byDate.set(dt, (byDate.get(dt) || 0) + s[i] * f); });
    }
    return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [histSets.join('|'), coll.length, d.ready]);

  if (!d.ready) return <div className="page"><Loading /></div>;
  const V = collectionValue(coll, d);
  const vh = valueHist.value || [];
  const vChange = vh.length > 1 ? ((vh.at(-1)[1] - vh[0][1]) / vh[0][1]) * 100 : null;
  const virtualCount = Object.keys(virtual).length;

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nexus-collection-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const doImport = async (f) => { try { importData(await f.text()); setMsg('Collection importée.'); } catch (e) { setMsg('Import impossible : ' + e.message); } };

  return (
    <div className="page collection-page">
      <div className="coll-head"><h1 className="page-title">Ma collection {GAMES[game].label}</h1>{coll.length > 0 && <button className="btn primary" onClick={() => setSharing(true)}><Icon name="ext" size={18} />Partager mon classeur</button>}</div>
      {otherCount > 0 && <p className="muted">Tu as aussi {otherCount} carte{otherCount > 1 ? 's' : ''} {GAMES[other].label} : <a className="link" href={href('/collection?u=' + other)}>voir ma collection {GAMES[other].label}</a></p>}
      {coll.length === 0 ? (
        <Empty icon="album" title="Ta collection est vide" action={<div className="row"><a className="btn primary" href={href('/scanner')}><Icon name="scan" size={18} />Scanner une carte</a><a className="btn ghost" href={href('/')}><Icon name="search" size={18} />Chercher une carte</a></div>}>
          Ajoute tes cartes depuis leur fiche ou avec le scanner : on calcule sa valeur au prix du jour.
          {virtualCount > 0 && <><br /><a href={href('/boosters/collection')}>Tu as aussi {virtualCount} cartes virtuelles gagnées en boosters →</a></>}
        </Empty>
      ) : (
        <>
          <div className="coll-stats">
            <div className="cs-main"><span className="kicker">Valeur estimée selon l’état</span><b>{fmtEur(V.total)}</b>{vChange != null && <span><Delta pct={vChange} /> depuis le {fmtDate(vh[0][0], { day: 'numeric', month: 'short' })}</span>}<small>Au prix Near Mint : {fmtEur(V.totalNM)}</small></div>
            <div><span>Cartes</span><b>{fmtNum(V.count)}</b><small>{fmtNum(V.unique)} différentes</small></div>
            <div><span>Avec un prix</span><b>{fmtNum(V.priced)}</b><small>sur {fmtNum(V.count)}</small></div>
            {V.paid > 0 && <div><span>Plus-value</span><b className={V.total - V.paid >= 0 ? 'up' : 'down'}>{fmtEur(V.total - V.paid)}</b><small>payé {fmtEur(V.paid)}</small></div>}
            {V.best && <a href={cardHref(V.best.c)} className="cs-best"><CardImage card={V.best.c} className="mini" /><span><small>Ta plus belle carte</small><b>{V.best.c.name}</b><em>{fmtEur(V.best.eur)}</em></span></a>}
          </div>

          {vh.length > 1 && <PriceChart series={[{ points: vh, color: 'var(--gold)' }]} height={180} />}

          <div className="toolbar">
            <Seg value={view} onChange={setView} label="Affichage" options={[['classeur', 'Classeur'], ['grille', 'Grille'], ['liste', 'Liste'], ['extensions', 'Extensions']]} />
            {view !== 'extensions' && <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier"><option value="valeur">Valeur</option><option value="recent">Ajout récent</option><option value="nom">Nom</option><option value="extension">Extension</option></select>}
            {view !== 'extensions' && <input className="filter" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filtrer…" aria-label="Filtrer" />}
          </div>

          {view === 'classeur' && <ShowBinder items={items} name={binder.name} cover={coverOf(binder, game)} game={game} stats={V} onOpen={setEdit} />}
          {view === 'grille' && <div className="grid tiles">{items.map((x) => <CollTile key={x.e.uid} x={x} onOpen={() => setEdit(x)} />)}</div>}
          {view === 'liste' && <CollList items={items} onOpen={setEdit} />}
          {view === 'extensions' && <SetProgress coll={coll} game={game} />}

          <div className="coll-tools">
            <button className="btn ghost" onClick={doExport}><Icon name="upload" size={18} />Exporter (sauvegarde)</button>
            <button className="btn ghost" onClick={() => file.current.click()}><Icon name="plus" size={18} />Importer</button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files[0] && doImport(e.target.files[0])} />
            {virtualCount > 0 && <a className="btn ghost" href={href('/boosters/collection')}><Icon name="pack" size={18} />Collection virtuelle ({virtualCount})</a>}
            {msg && <span className="muted">{msg}</span>}
          </div>
          <p className="source-note">Ta collection est enregistrée dans ce navigateur, sans compte. Exporte-la régulièrement pour la garder en sécurité ou la passer sur un autre appareil.</p>
        </>
      )}
      <EntryModal x={edit} onClose={() => setEdit(null)} />
      <ShareModal open={sharing} onClose={() => setSharing(false)} game={game} entries={items.length && !q.trim() ? items.map((x) => x.e) : coll} />
    </div>
  );
}

function CollTile({ x, onOpen }) {
  const { P, fx } = useData();
  const eur = eurOf(x.c, P, fx);
  const cond = condOf(x.e.cond);
  return (
    <button className="tile" onClick={onOpen}>
      <div className="tile-img"><CardImage card={x.c} />{x.e.qty > 1 && <span className="qty">×{x.e.qty}</span>}<span className={'cond-badge c-' + cond.id}>{x.e.grade != null ? x.e.grade.toLocaleString('fr-FR') : cond.short}</span></div>
      <div className="tile-body"><div className="tile-name">{x.c.name}</div><div className="tile-meta"><GameTag game={x.c.game} /> {x.c.number}</div><div className="tile-price">{eur != null ? fmtEur(eur * cond.factor) : <span className="price none">Pas de prix</span>}</div></div>
    </button>
  );
}

function CollList({ items, onOpen }) {
  const { P, fx, cats } = useData();
  return (
    <div className="coll-list">
      {items.map((x) => {
        const eur = eurOf(x.c, P, fx); const cond = condOf(x.e.cond);
        return (
          <button key={x.e.uid} className="cl-row" onClick={() => onOpen(x)}>
            <CardImage card={x.c} className="mini" />
            <span className="cl-name">{x.c.name}<small><GameTag game={x.c.game} /> {x.c.number} · {cats[x.c.game].sets.get(x.c.set)?.name}</small></span>
            <span className={'cond-badge inline c-' + cond.id}>{cond.short}{x.e.grade != null ? ' · ' + x.e.grade.toLocaleString('fr-FR') + '/10' : ''}</span>
            <span className="cl-qty">×{x.e.qty}</span>
            <span className="cl-val">{eur != null ? fmtEur(eur * cond.factor * x.e.qty) : '—'}</span>
          </button>
        );
      })}
    </div>
  );
}

function SetProgress({ coll, game }) {
  const d = useData();
  const rows = useMemo(() => {
    const owned = new Map();
    for (const e of coll) { const c = resolve(d, e.key); if (!c) continue; const k = c.game + '|' + c.set; if (!owned.has(k)) owned.set(k, new Set()); owned.get(k).add(c.id); }
    return [...owned.entries()].map(([k, ids]) => { const [g, s] = k.split('|'); return { g, s: d.cats[g].sets.get(s), have: ids.size }; })
      .filter((r) => r.s && (game === 'all' || r.g === game)).sort((a, b) => b.have / b.s.count - a.have / a.s.count);
  }, [coll, game]);
  return (
    <div className="set-progress">
      {rows.map((r) => (
        <a key={r.g + r.s.code} href={href('/extension/' + r.g + '/' + encodeURIComponent(r.s.code))} className="sp-row">
          <GameTag game={r.g} /><span className="sp-name">{r.s.name}<small>{r.s.code}</small></span>
          <div className="progress"><i style={{ width: Math.min(100, (r.have / r.s.count) * 100) + '%' }} /></div>
          <b>{r.have}/{r.s.count}</b><small>{Math.round((r.have / r.s.count) * 100)} %</small>
        </a>
      ))}
    </div>
  );
}

function EntryModal({ x, onClose }) {
  const { P, fx } = useData();
  const e = useStore((s) => s.collection.find((y) => y.uid === x?.e.uid));
  if (!x || !e) return null;
  const eur = eurOf(x.c, P, fx);
  return (
    <Modal open title={x.c.name + ' · ' + x.c.number} onClose={onClose}>
      <div className="entry">
        <CardImage card={x.c} size="large" />
        <div className="entry-form">
          <p><Price card={x.c} /> <small className="muted">prix du jour (Near Mint)</small></p>
          <label>Quantité<div className="stepper"><button onClick={() => e.qty > 1 && updateEntry(e.uid, { qty: e.qty - 1 })}><Icon name="minus" size={16} /></button><b>{e.qty}</b><button onClick={() => updateEntry(e.uid, { qty: e.qty + 1 })}><Icon name="plus" size={16} /></button></div></label>
          <label>État<select value={e.cond} onChange={(ev) => updateEntry(e.uid, { cond: ev.target.value })}>{CONDITIONS.map((c) => <option key={c.id} value={c.id}>{c.short} · {c.label}</option>)}</select></label>
          <label>Langue<select value={e.lang} onChange={(ev) => updateEntry(e.uid, { lang: ev.target.value })}><option value="en">Anglais</option><option value="fr">Français</option><option value="jp">Japonais</option></select></label>
          <label>Prix payé (par carte, en €)<input type="number" min="0" step="0.01" inputMode="decimal" defaultValue={e.paid ?? ''} onBlur={(ev) => updateEntry(e.uid, { paid: ev.target.value === '' ? null : +ev.target.value })} placeholder="facultatif" /> </label>
          {e.grade != null && <div className="grade-recall"><b>{e.grade.toLocaleString('fr-FR')}/10</b><span>Note du scanner{e.scan?.date ? ' · ' + fmtDate(e.scan.date) : ''}</span>{e.scan?.parts && <small>Centrage {e.scan.parts.centering} · Coins {e.scan.parts.corners} · Bords {e.scan.parts.edges} · Surface {e.scan.parts.surface}</small>}</div>}
          {eur != null && <p className="muted">Valeur selon l’état : <b>{fmtEur(eur * condOf(e.cond).factor * e.qty)}</b></p>}
          <div className="row"><a className="btn ghost" href={cardHref(x.c)} onClick={onClose}>Fiche de la carte</a><button className="btn danger" onClick={() => { removeEntry(e.uid); onClose(); }}><Icon name="trash" size={18} />Retirer</button></div>
        </div>
      </div>
    </Modal>
  );
}
