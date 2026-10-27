import { useEffect, useState, useSyncExternalStore } from 'react';
import { allCatalogs, allPrices, market, setDisplayCurrency } from './data.js';
import { applyLang, loadJapanese } from './lang.js';
import { getState, onStore } from './store.js';

// ---- Routeur par fragment (#/chemin?x=1), compatible GitHub Pages ----
function parse() {
  const h = location.hash.replace(/^#/, '') || '/';
  const [p, qs] = h.split('?');
  const parts = p.split('/').filter(Boolean).map(decodeURIComponent);
  return { path: '/' + parts.join('/'), parts, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}
let route = parse();
const rsubs = new Set();
window.addEventListener('hashchange', () => { route = parse(); rsubs.forEach((f) => f()); window.scrollTo({ top: 0, behavior: 'instant' }); });
// Univers courant : One Piece ou Pokémon, d'après l'adresse, sinon le dernier visité
const UNIV_ROUTES = { op: 'onepiece', equipage: 'onepiece', pk: 'pokemon', pokedex: 'pokemon' };
export function universeOf(r, last) {
  const p = r.parts;
  if (UNIV_ROUTES[p[0]]) return UNIV_ROUTES[p[0]];
  if (p[0] === 'carte' && p[1]) { const g = p[1].split(':')[0]; if (g === 'onepiece' || g === 'pokemon') return g; }
  if ((p[0] === 'extensions' || p[0] === 'extension') && (p[1] === 'onepiece' || p[1] === 'pokemon')) return p[1];
  if (r.query.u === 'onepiece' || r.query.u === 'pokemon') return r.query.u;
  return last || 'onepiece';
}
export const UNIV_HOME = { onepiece: '/op', pokemon: '/pk' };
export const useRoute = () => useSyncExternalStore((f) => { rsubs.add(f); return () => rsubs.delete(f); }, () => route);
export const go = (to) => { location.hash = to; };
export const href = (to) => '#' + to;
export const cardHref = (c) => href('/carte/' + encodeURIComponent(c.key || c.game + ':' + c.id));

// ---- Données partagées, chargées une fois ----
let data = { ready: false };
let started = false;
const dsubs = new Set();
const emitData = () => dsubs.forEach((f) => f());
function start() {
  if (started) return; started = true;
  Promise.all([allCatalogs(), allPrices(), market()]).then(async ([cats, P, M]) => {
    const fx = M?.fx?.usdEur || P.onepiece?.source?.fx?.usdEur || null;
    let lang = getState().lang || 'en';
    try { await applyLang(cats, lang); } catch {}
    setDisplayCurrency(lang, M?.fx);
    data = { ready: true, cats, P, M, fx, lang, jp: false };
    emitData();
    // cartes japonaises Pokémon, chargées en arrière-plan
    loadJapanese(cats).then((ok) => { if (ok) { data = { ...data, jp: true }; emitData(); } });
    // changement de langue
    onStore(() => {
      const l = getState().lang || 'en';
      if (l === lang) return;
      lang = l;
      applyLang(cats, l).then(() => { if (lang === l) { setDisplayCurrency(l, data.M?.fx); data = { ...data, lang: l }; emitData(); } });
    });
  }).catch((e) => { data = { ready: false, error: e.message }; emitData(); });
}
export function useData() {
  start();
  return useSyncExternalStore((f) => { dsubs.add(f); return () => dsubs.delete(f); }, () => data);
}
export const getData = () => data;

export function useAsync(fn, deps) {
  const [s, set] = useState({ loading: true });
  useEffect(() => {
    let alive = true;
    set((x) => ({ ...x, loading: true }));
    Promise.resolve().then(fn).then((value) => alive && set({ value }), (error) => alive && set({ error }));
    return () => { alive = false; };
  }, deps);
  return s;
}

export function useMedia(q) {
  const [m, set] = useState(() => matchMedia(q).matches);
  useEffect(() => { const mq = matchMedia(q); const f = () => set(mq.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f); }, [q]);
  return m;
}

export function useNow(ms = 1000) {
  const [n, set] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => set(Date.now()), ms); return () => clearInterval(t); }, [ms]);
  return n;
}
