// État local persistant (sans compte) : collection, suivis, comparateur, boosters
import { useSyncExternalStore } from 'react';

const KEY = 'nexus.v2';
const DEFAULT = {
  collection: [],          // { uid, key, qty, cond, grade, lang, addedAt, paid, scan }
  watch: {},               // key → { addedAt, below, above, baseline }
  compare: [],             // clés (max 4)
  packs: { energy: 10, refillAt: 0, opened: 0, best: null, virtual: {}, log: [] },
  recent: [],              // cartes consultées
  notified: {},            // alertes déjà signalées : key → date
  universe: null,          // dernier univers visité
  wallet: {},              // univers → { coins, day, today, opened }
};

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT);
    const v = JSON.parse(raw);
    return { ...structuredClone(DEFAULT), ...v, packs: { ...DEFAULT.packs, ...(v.packs || {}) } };
  } catch { return structuredClone(DEFAULT); }
}

let state = read();
const subs = new Set();
function emit() { for (const f of subs) f(); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} }

export function update(fn) {
  const next = structuredClone(state);
  fn(next);
  state = next;
  save();
  emit();
}
export const getState = () => state;
export function useStore(sel = (s) => s) {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => sel(state));
}
window.addEventListener('storage', (e) => { if (e.key === KEY) { state = read(); emit(); } });

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

// ---- Collection ----
export const CONDITIONS = [
  { id: 'MT', label: 'Mint', short: 'MT', factor: 1.15, hint: 'Parfaite, comme sortie du booster' },
  { id: 'NM', label: 'Near Mint', short: 'NM', factor: 1, hint: 'Quasi parfaite, défauts invisibles' },
  { id: 'EX', label: 'Excellent', short: 'EX', factor: 0.8, hint: 'Légère usure sur un bord ou un coin' },
  { id: 'GD', label: 'Good', short: 'GD', factor: 0.6, hint: 'Usure visible, blanchiment' },
  { id: 'LP', label: 'Light Played', short: 'LP', factor: 0.45, hint: 'Usure nette, petits plis' },
  { id: 'PL', label: 'Played', short: 'PL', factor: 0.3, hint: 'Très jouée, plis, rayures' },
  { id: 'PO', label: 'Poor', short: 'PO', factor: 0.15, hint: 'Abîmée' },
];
export const condOf = (id) => CONDITIONS.find((c) => c.id === id) || CONDITIONS[1];

export function addToCollection(key, { qty = 1, cond = 'NM', grade = null, lang = 'en', paid = null, scan = null } = {}) {
  update((s) => {
    const same = !scan && s.collection.find((e) => e.key === key && e.cond === cond && e.lang === lang && !e.grade);
    if (same) same.qty += qty;
    else s.collection.unshift({ uid: uid(), key, qty, cond, grade, lang, paid, scan, addedAt: new Date().toISOString() });
  });
}
export const updateEntry = (u, patch) => update((s) => { const e = s.collection.find((x) => x.uid === u); if (e) Object.assign(e, patch); });
export const removeEntry = (u) => update((s) => { s.collection = s.collection.filter((x) => x.uid !== u); });

// ---- Suivis et alertes ----
export const toggleWatch = (key, baseline) => update((s) => {
  if (s.watch[key]) delete s.watch[key];
  else s.watch[key] = { addedAt: new Date().toISOString(), below: null, above: null, baseline: baseline ?? null };
});
export const setAlert = (key, patch) => update((s) => { s.watch[key] = { addedAt: new Date().toISOString(), below: null, above: null, baseline: null, ...(s.watch[key] || {}), ...patch }; });

// ---- Comparateur ----
export const toggleCompare = (key) => update((s) => {
  if (s.compare.includes(key)) s.compare = s.compare.filter((k) => k !== key);
  else { s.compare.push(key); if (s.compare.length > 4) s.compare.shift(); }
});

export const pushRecent = (key) => update((s) => { s.recent = [key, ...s.recent.filter((k) => k !== key)].slice(0, 12); });

// ---- Énergie des boosters : 10 ouvertures, une recharge toutes les 30 minutes ----
export const ENERGY_MAX = 10;
export const REFILL_MS = 30 * 60 * 1000;
export function energyNow(p = state.packs, now = Date.now()) {
  if (p.energy >= ENERGY_MAX) return { energy: ENERGY_MAX, next: null };
  const since = now - (p.refillAt || now);
  const gained = Math.floor(since / REFILL_MS);
  const energy = Math.min(ENERGY_MAX, p.energy + gained);
  return { energy, next: energy >= ENERGY_MAX ? null : (p.refillAt || now) + (gained + 1) * REFILL_MS };
}
export function spendEnergy() {
  const { energy } = energyNow();
  if (energy <= 0) return false;
  update((s) => {
    const now = Date.now();
    const cur = energyNow(s.packs, now);
    const gainedMs = s.packs.energy >= ENERGY_MAX ? 0 : Math.floor((now - (s.packs.refillAt || now)) / REFILL_MS) * REFILL_MS;
    s.packs.energy = cur.energy - 1;
    s.packs.refillAt = cur.energy >= ENERGY_MAX ? now : (s.packs.refillAt || now) + gainedMs;
  });
  return true;
}

export function exportData() { return JSON.stringify({ app: 'NEXUS TCG', version: 2, exportedAt: new Date().toISOString(), ...state }, null, 1); }
export function importData(text) {
  const v = JSON.parse(text);
  if (!v || !Array.isArray(v.collection)) throw new Error('Fichier non reconnu');
  update((s) => {
    const known = new Set(s.collection.map((e) => e.uid));
    for (const e of v.collection) if (e.key && !known.has(e.uid)) s.collection.push({ ...e, uid: e.uid || uid() });
    Object.assign(s.watch, v.watch || {});
    for (const [k, n] of Object.entries(v.packs?.virtual || {})) s.packs.virtual[k] = Math.max(s.packs.virtual[k] || 0, n);
  });
}

import { useRoute, universeOf } from './hooks.js';
export function useUniverse() {
  const r = useRoute();
  const last = useStore((s) => s.universe);
  return universeOf(r, last);
}

// ---- Berrys (One Piece) et Pokéballs (Pokémon) : 1 000 au départ, +200 par jour, même les jours d'absence ----
const dayKey = (t = new Date()) => t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
const dayDiff = (a, b) => Math.round((new Date(b + 'T12:00') - new Date(a + 'T12:00')) / 86400000);
export function claimDaily(game, start = 1000, daily = 200) {
  const today = dayKey();
  const w = state.wallet?.[game];
  if (w && w.day === today) return 0;
  let gained = 0;
  update((s) => {
    s.wallet ||= {};
    const cur = s.wallet[game];
    if (!cur) { s.wallet[game] = { coins: start, day: today, openedToday: 0, opened: 0, best: null }; return; }
    const days = Math.max(0, Math.min(30, dayDiff(cur.day, today)));
    gained = days * daily;
    cur.coins += gained; cur.day = today; cur.openedToday = 0; cur.lastGain = gained;
  });
  return gained;
}
export function spendCoins(game, amount) {
  if (state.admin) { if (!state.wallet?.[game]) claimDaily(game); return true; }
  const w = state.wallet?.[game];
  if (!w || w.coins < amount) return false;
  update((s) => { s.wallet[game].coins -= amount; });
  return true;
}

// ---- Mode administrateur : Berrys et Pokéballs illimités sur cet appareil ----
// Activé par un lien secret #/admin/<code> ; seule l'empreinte SHA-256 du code figure ici.
const ADMIN_HASH = '5f6ec8114b0e48bd4bcb01814655127164e61618d7c4e7d69ac11fdf821dcc49';
export async function tryAdmin(code) {
  if (code === 'off') { update((s) => { s.admin = false; }); return 'off'; }
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(code));
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  if (hex !== ADMIN_HASH) return 'bad';
  update((s) => { s.admin = true; });
  return 'on';
}
