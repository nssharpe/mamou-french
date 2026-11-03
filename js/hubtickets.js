// Family hub tickets: turns qualifying quiz cards into hub ticket events.
//
// Pure logic plus a thin glue layer that takes the storage object as an argument, so it never
// touches the DOM or localStorage at import time and `npm test` can import it in node.
//
// A card qualifies when: quiz mode, answered correctly, not a repeat after a miss (rec.recovering),
// and not the check right after a new-word introduction (cur.fresh). Flip mode and games earn nothing.

import { readHandoff, createOutbox, getHub, effectiveSettings, isHubCode } from './hub-client.js';

export const HUB_KEY = 'mamou-fr:hub';
export const HUB_SETTINGS_KEY = 'mamou-fr:hub-settings';
export const HUB_OUTBOX_KEY = 'mamou-fr:hub-outbox';
export const DEFAULT_CARDS_PER_TICKET = 4;

// Hub kid id <-> French profile id. Only these two profiles report to the hub.
const PID_BY_KID = { zyler: 'p-zyler', kadyn: 'p-kadyn' };
const KID_BY_PID = { 'p-zyler': 'zyler', 'p-kadyn': 'kadyn' };
export const kidForPid = pid => KID_BY_PID[pid] || null;
export const pidForKid = kid => (typeof kid === 'string' && Object.hasOwn(PID_BY_KID, kid) ? PID_BY_KID[kid] : null);

const goodRate = n => Number.isInteger(n) && n >= 1;

// Adds `qualifyingCards` to prog.hubUnits and converts every full `perTicket` into a whole ticket.
// Returns the tickets earned; the remainder stays in prog.hubUnits.
export function cardsToTickets(prog, qualifyingCards, perTicket) {
  const per = goodRate(perTicket) ? perTicket : DEFAULT_CARDS_PER_TICKET;
  const add = Number.isFinite(qualifyingCards) && qualifyingCards > 0 ? Math.floor(qualifyingCards) : 0;
  const units = Math.max(0, Math.floor(Number(prog.hubUnits) || 0)) + add;
  const tickets = Math.floor(units / per);
  prog.hubUnits = units - tickets * per;
  return tickets;
}

// ---------- storage glue ----------

function read(storage, key) {
  try { return storage.getItem(key); } catch { return null; }
}

// The stored hub code, or null.
export function hubCode(storage) {
  const c = read(storage, HUB_KEY);
  return isHubCode(c) ? c : null;
}

// Handles '#hub=<code>&kid=<kidId>'. Stores the code and returns { code, kid, pid } (pid is the
// French profile for that kid, or null), or null when the hash is not a hub handoff.
export function storeHandoff(storage, hash) {
  const h = readHandoff(hash);
  if (!h) return null;
  try { storage.setItem(HUB_KEY, h.code); } catch { /* storage blocked: this visit still works */ }
  return { code: h.code, kid: h.kid, pid: pidForKid(h.kid) };
}

// Cards per ticket from the cached hub settings (pending changes apply from their day). Default 4.
export function perTicketFor(storage, now = Date.now()) {
  try {
    const raw = read(storage, HUB_SETTINGS_KEY);
    const doc = raw ? JSON.parse(raw) : null;
    const eff = doc ? effectiveSettings(doc, now) : null;
    const n = eff && eff.rates && eff.rates.frenchCardsPerTicket;
    if (goodRate(n)) return n;
  } catch { /* unreadable cache: use the default */ }
  return DEFAULT_CARDS_PER_TICKET;
}

// Fetches the hub settings and caches them for perTicketFor. Never throws.
export async function refreshHubSettings(storage) {
  const code = hubCode(storage);
  if (!code) return;
  try {
    const hub = await getHub(code);
    if (hub && hub.settings) storage.setItem(HUB_SETTINGS_KEY, JSON.stringify(hub.settings));
  } catch { /* offline or blocked: keep the cached rate */ }
}

let outboxFor = null;
let outboxStore = null;
// One outbox per storage object, so every caller shares the same in-flight flush.
export function hubOutbox(storage) {
  if (!outboxFor || outboxStore !== storage) { outboxStore = storage; outboxFor = createOutbox(storage, HUB_OUTBOX_KEY); }
  return outboxFor;
}

// Sends anything waiting in the outbox (no-op without a hub code). Never throws.
export function flushHub(storage) {
  const code = hubCode(storage);
  if (!code) return Promise.resolve({ sent: 0, failed: 0 });
  return hubOutbox(storage).flush(code).catch(() => ({ sent: 0, failed: 0 }));
}

// Converts `cards` qualifying cards for one kid into a ticket event and queues it, then flushes.
// Returns null when nothing reports (no hub code, a profile that is not a hub kid, or no cards);
// otherwise the whole tickets earned (prog.hubUnits changed, so the caller should save).
export function reportHub({ storage, outbox = hubOutbox(storage), prog, pid, cards, now = Date.now(), flush = true }) {
  const code = hubCode(storage);
  const kid = kidForPid(pid);
  if (!code || !kid || !(cards > 0)) return null;
  const tickets = cardsToTickets(prog, cards, perTicketFor(storage, now));
  if (tickets > 0) outbox.add({ id: `french:${kid}:${now}`, kid, app: 'french', tickets, ts: now, detail: `${cards} cards` });
  if (flush) outbox.flush(code).catch(() => {});
  return tickets;
}
