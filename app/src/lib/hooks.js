import { useEffect, useState, useSyncExternalStore } from 'react';
import { allCatalogs, allPrices, market } from './data.js';

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
export const useRoute = () => useSyncExternalStore((f) => { rsubs.add(f); return () => rsubs.delete(f); }, () => route);
export const go = (to) => { location.hash = to; };
export const href = (to) => '#' + to;
export const cardHref = (c) => href('/carte/' + encodeURIComponent(c.key || c.game + ':' + c.id));

// ---- Données partagées, chargées une fois ----
let data = { ready: false };
let started = false;
const dsubs = new Set();
function start() {
  if (started) return; started = true;
  Promise.all([allCatalogs(), allPrices(), market()]).then(([cats, P, M]) => {
    const fx = M?.fx?.usdEur || P.onepiece?.source?.fx?.usdEur || null;
    data = { ready: true, cats, P, M, fx };
    dsubs.forEach((f) => f());
  }).catch((e) => { data = { ready: false, error: e.message }; dsubs.forEach((f) => f()); });
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
