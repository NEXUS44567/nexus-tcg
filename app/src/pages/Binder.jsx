import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useData, href, cardHref } from '../lib/hooks.js';
import { useStore, update, condOf, CONDITIONS } from '../lib/store.js';
import { eurOf, fmtEur, fmtNum, GAMES } from '../lib/data.js';
import { CardImage, Icon, Loading, Modal, PirateEmblem, EnergyEmblem } from '../components.jsx';

// Classeur de présentation : couverture en cuir, pages à 9 pochettes, double page sur grand écran,
// pages qui se tournent (boutons, clavier, glisser), lien de partage qui contient la liste des cartes.

export const COVERS = [
  ['rouge', 'Rouge corsaire', '#8e1b1f'],
  ['marine', 'Bleu marine', '#1b2c5e'],
  ['noir', 'Noir', '#1a181f'],
  ['vert', 'Vert émeraude', '#14523c'],
  ['violet', 'Violet', '#4a2370'],
  ['camel', 'Cuir camel', '#8a5a2b'],
];
const PER = 9;

// ---- Lien de partage : [nom, couverture, jeu, [[id, qté, état, note]]] compressé en base64url ----
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const unb64 = (s) => { const t = atob(s.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(t, (c) => c.charCodeAt(0)); };
async function pipe(u8, stream) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer()); }
const CIDX = CONDITIONS.map((c) => c.id);

export async function encodeBinder({ name, cover, game, entries }) {
  const json = JSON.stringify([name || '', cover || 'rouge', game, entries.map((e) => { const id = e.key.slice(game.length + 1); const r = [id, e.qty]; let ci = CIDX.indexOf(e.cond); if (ci < 0) ci = 1; if (ci !== 1 || e.grade != null) r.push(ci); if (e.grade != null) r.push(e.grade); return r; })]);
  const raw = new TextEncoder().encode(json);
  if (typeof CompressionStream === 'function') { try { return 'z' + b64(await pipe(raw, new CompressionStream('deflate-raw'))); } catch {} }
  return 'j' + b64(raw);
}
export async function decodeBinder(s) {
  const kind = s[0], body = unb64(s.slice(1));
  if (kind === 'z' && typeof DecompressionStream !== 'function') throw new Error('navigateur trop ancien');
  const raw = kind === 'z' ? await pipe(body, new DecompressionStream('deflate-raw')) : body;
  const [name, cover, game, list] = JSON.parse(new TextDecoder().decode(raw));
  if (!GAMES[game] || !Array.isArray(list)) throw new Error('lien invalide');
  return { name, cover, game, entries: list.map(([id, qty, ci = 1, grade = null], i) => ({ uid: 's' + i, key: game + ':' + id, qty: qty || 1, cond: CIDX[ci] || 'NM', grade })) };
}

function useWide() {
  const q = '(min-width: 860px)';
  const [w, setW] = useState(() => matchMedia(q).matches);
  useEffect(() => { const m = matchMedia(q), f = () => setW(m.matches); if (m.addEventListener) { m.addEventListener('change', f); return () => m.removeEventListener('change', f); } m.addListener(f); return () => m.removeListener(f); }, []);
  return w;
}

function Pocket({ x, onOpen, readOnly }) {
  const { P, fx } = useData();
  if (!x) return <div className="bd-pocket empty"><i className="bd-sleeve" /></div>;
  const cond = condOf(x.e.cond);
  const eur = eurOf(x.c, P, fx);
  const inner = (
    <>
      <CardImage card={x.c} />
      <i className="bd-sleeve" />
      {x.e.qty > 1 && <span className="bd-qty">×{x.e.qty}</span>}
      {x.e.grade != null ? <span className="bd-grade">{x.e.grade.toLocaleString('fr-FR')}</span> : cond.id !== 'NM' && <span className="bd-cond">{cond.short}</span>}
      <span className="bd-tip"><b>{x.c.name}</b><small>{x.c.number}{eur != null ? ' · ' + fmtEur(eur * cond.factor) : ''}</small></span>
    </>
  );
  return readOnly
    ? <a className="bd-pocket" href={cardHref(x.c)}>{inner}</a>
    : <div className="bd-pocket" role="button" tabIndex={0} onClick={() => onOpen?.(x)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(x); } }}>{inner}</div>;
}

function Page({ items, n, side, anim, onOpen, readOnly }) {
  const { P, fx } = useData();
  const val = items.reduce((t, x) => t + (x ? (eurOf(x.c, P, fx) || 0) * condOf(x.e.cond).factor * x.e.qty : 0), 0);
  return (
    <div className={'bd-page ' + side + (anim ? ' turn-' + anim : '')}>
      <div className="bd-grid">{Array.from({ length: PER }, (_, i) => <Pocket key={i} x={items[i]} onOpen={onOpen} readOnly={readOnly} />)}</div>
      <div className="bd-foot"><span>{n}</span>{val > 0 && <small>{fmtEur(val)}</small>}</div>
    </div>
  );
}

function Rings() { return <div className="bd-rings" aria-hidden="true"><i /><i /><i /></div>; }

export function Cover({ name, cover, game, stats, onOpen, small }) {
  const color = (COVERS.find((c) => c[0] === cover) || COVERS[0])[2];
  return (
    <button className={'bd-cover' + (small ? ' small' : '')} style={{ '--leather': color }} onClick={onOpen} aria-label="Ouvrir le classeur">
      <span className="bd-spine" />
      <span className="bd-stitch" />
      <span className="bd-cover-in">
        <span className="bd-emblem">{game === 'onepiece' ? <PirateEmblem size={96} /> : <EnergyEmblem size={96} />}</span>
        <span className="bd-cover-title">{name || 'Mon classeur'}</span>
        <span className="bd-cover-sub">{GAMES[game].label} · collection</span>
        {stats && <span className="bd-cover-stats"><span><b>{fmtNum(stats.count)}</b> cartes</span><span><b>{fmtNum(stats.unique)}</b> différentes</span>{stats.total > 0 && <span><b>{fmtEur(stats.total)}</b> au prix du jour</span>}</span>}
        <span className="bd-cover-stamp">NEXUS TCG</span>
      </span>
      <span className="bd-strap" />
    </button>
  );
}

export function ShowBinder({ items, name, cover, game, stats, onOpen, readOnly, startClosed }) {
  const wide = useWide();
  const [open, setOpen] = useState(!startClosed);
  const [sp, setSp] = useState(0);
  const [anim, setAnim] = useState(null);
  const per = wide ? PER * 2 : PER;
  const pages = Math.max(1, Math.ceil(items.length / PER));
  const spreads = wide ? Math.max(1, Math.ceil(pages / 2)) : pages;
  const cur = Math.min(sp, spreads - 1);
  const go = (d) => { const n = cur + d; if (n < 0 || n >= spreads) return; setAnim(d > 0 ? 'next' : 'prev'); setSp(n); };
  const touch = useRef(null);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const k = (e) => { if (e.target.closest('input, textarea, select')) return; if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
    addEventListener('keydown', k); return () => removeEventListener('keydown', k);
  });
  if (!open) return <div className="bd-wrap closed"><Cover name={name} cover={cover} game={game} stats={stats} onOpen={() => setOpen(true)} /><p className="muted small">Touche la couverture pour ouvrir le classeur</p></div>;
  const color = (COVERS.find((c) => c[0] === cover) || COVERS[0])[2];
  const slice = (pi) => items.slice(pi * PER, pi * PER + PER);
  const left = wide ? cur * 2 : cur;
  return (
    <div className="bd-wrap" ref={ref}>
      <div className={'bd-book' + (wide ? ' wide' : '')} style={{ '--leather': color }}
        onTouchStart={(e) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY, swiped: false }; }}
        onTouchEnd={(e) => { const t = touch.current; if (!t) return; const p = e.changedTouches[0]; const dx = p.clientX - t.x, dy = p.clientY - t.y; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) { t.swiped = true; go(dx < 0 ? 1 : -1); setTimeout(() => { touch.current = null; }, 350); } else touch.current = null; }}
        onClickCapture={(e) => { if (touch.current?.swiped) { e.stopPropagation(); e.preventDefault(); } }}>
        <div className="bd-leaf" key={cur + (wide ? 'w' : 'n')}>
          <Page items={slice(left)} n={left + 1} side={wide ? 'left' : 'single'} onOpen={onOpen} readOnly={readOnly} anim={!wide ? anim : anim === 'prev' ? 'prev' : null} />
          {wide && <Page items={slice(left + 1)} n={left + 2} side="right" onOpen={onOpen} readOnly={readOnly} anim={anim === 'next' ? 'next' : null} />}
        </div>
        <Rings />
      </div>
      <div className="bd-nav">
        <button className="btn ghost" disabled={cur === 0} onClick={() => go(-1)} aria-label="Page précédente">‹</button>
        <span>{wide ? `Pages ${left + 1}–${Math.min(left + 2, pages)}` : `Page ${left + 1}`} / {pages}</span>
        <button className="btn ghost" disabled={cur >= spreads - 1} onClick={() => go(1)} aria-label="Page suivante">›</button>
        <button className="btn ghost" onClick={() => { setOpen(false); setSp(0); }}>Fermer le classeur</button>
      </div>
    </div>
  );
}

// ---- Fenêtre de partage ----
export function ShareModal({ open, onClose, game, entries }) {
  const b = useStore((s) => s.binder);
  const [url, setUrl] = useState('');
  const [msg, setMsg] = useState('');
  const name = b.name ?? '', cover = b.cover || 'rouge';
  const setB = (patch) => update((s) => { s.binder = { ...(s.binder || {}), ...patch }; });
  useEffect(() => { setUrl(''); setMsg(''); }, [open, name, cover, entries.length]);
  if (!open) return null;
  const make = async () => {
    const code = await encodeBinder({ name, cover, game, entries });
    const u = location.origin + location.pathname + '#/classeur/' + code + '?u=' + game;
    setUrl(u); return u;
  };
  const share = async () => {
    const u = url || (await make());
    if (navigator.share) { try { await navigator.share({ title: (name || 'Mon classeur') + ' · NEXUS TCG', text: `Mon classeur ${GAMES[game].label} : ${entries.length} cartes`, url: u }); return; } catch (e) { if (e?.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(u); setMsg('Lien copié !'); } catch { setMsg('Sélectionne le lien ci-dessous pour le copier.'); }
  };
  const copy = async () => { const u = url || (await make()); try { await navigator.clipboard.writeText(u); setMsg('Lien copié !'); } catch { setMsg('Sélectionne le lien pour le copier.'); } };
  return (
    <Modal open title="Partager mon classeur" onClose={onClose}>
      <div className="bd-share">
        <Cover name={name} cover={cover} game={game} small />
        <div className="bd-share-form">
          <label>Nom du classeur<input value={name} maxLength={40} placeholder="Mon classeur" onChange={(e) => setB({ name: e.target.value })} /></label>
          <div className="bd-colors" role="radiogroup" aria-label="Couleur de la couverture">
            {COVERS.map(([id, label, c]) => <button key={id} role="radio" aria-checked={cover === id} aria-label={label} title={label} className={cover === id ? 'on' : ''} style={{ background: c }} onClick={() => setB({ cover: id })} />)}
          </div>
          <div className="row">
            <button className="btn primary" onClick={share}><Icon name="ext" size={18} />Partager</button>
            <button className="btn ghost" onClick={copy}>Copier le lien</button>
          </div>
          {msg && <p className="ok-msg">{msg}</p>}
          {url && <input className="bd-url" readOnly value={url} onFocus={(e) => e.target.select()} />}
          <p className="source-note">Le lien contient la liste de tes {fmtNum(entries.length)} cartes {GAMES[game].label} (avec quantité, état et note), sans tes prix payés. La personne qui l’ouvre voit ton classeur avec les prix du jour. Si tu ajoutes des cartes, crée un nouveau lien.</p>
        </div>
      </div>
    </Modal>
  );
}

// ---- Page publique : #/classeur/<code> ----
export function SharedBinderPage({ code }) {
  const d = useData();
  const [res, setRes] = useState(null);
  useEffect(() => { let ok = true; decodeBinder(code).then((r) => ok && setRes(r), (e) => ok && setRes({ error: e.message || 'lien invalide' })); return () => { ok = false; }; }, [code]);
  const items = useMemo(() => {
    if (!d.ready || !res?.entries) return [];
    return res.entries.map((e) => { const [g, ...r] = e.key.split(':'); return { e, c: d.cats[g]?.byId.get(r.join(':')) }; }).filter((x) => x.c);
  }, [d.ready, res]);
  useEffect(() => { if (res?.name != null) document.title = (res.name || 'Classeur') + ' · NEXUS TCG'; }, [res]);
  if (!res || !d.ready) return <div className="page"><Loading /></div>;
  if (res.error) return <div className="page"><h1 className="page-title">Ce lien de classeur ne marche pas</h1><p className="muted">{res.error === 'navigateur trop ancien' ? 'Ton navigateur est trop ancien pour lire ce lien : mets-le à jour (iOS 16.4 ou plus récent, Chrome, Firefox…).' : 'Il est peut-être incomplet. Demande à la personne de te le renvoyer.'}</p><a className="btn primary" href={href('/collection')}>Créer mon classeur</a></div>;
  let total = 0, count = 0;
  for (const x of items) { count += x.e.qty; total += (eurOf(x.c, d.P, d.fx) || 0) * condOf(x.e.cond).factor * x.e.qty; }
  const stats = { count, unique: items.length, total };
  return (
    <div className="page binder-share-page">
      <span className="kicker">Classeur partagé · {GAMES[res.game].label}</span>
      <h1 className="page-title">{res.name || 'Classeur'}</h1>
      <p className="muted">{fmtNum(count)} cartes, {fmtNum(items.length)} différentes{total > 0 ? <> · valeur estimée au prix du jour : <b>{fmtEur(total)}</b></> : null}</p>
      <ShowBinder items={items} name={res.name} cover={res.cover} game={res.game} stats={stats} readOnly startClosed />
      <div className="row center"><a className="btn primary" href={href('/collection')}><Icon name="album" size={18} />Créer mon propre classeur</a></div>
    </div>
  );
}
