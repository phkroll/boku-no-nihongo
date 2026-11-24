// Personal knowledge: append-only ratings. Current state = latest rating per target.
import { CONFIDENCE, RATING_VALUES, newId, nowIso } from './data.js';

const TARGET_KEYS = ['unit', 'from', 'to', 'meaningId', 'readingId', 'form', 'members'];

function cleanTarget(target) {
  const out = {};
  for (const k of TARGET_KEYS) {
    const v = target[k];
    if (v === undefined || v === '' || (Array.isArray(v) && v.length === 0)) continue;
    out[k] = v;
  }
  return out;
}

export function targetKey(target) {
  const t = cleanTarget(target);
  return TARGET_KEYS.filter((k) => k in t).map((k) => `${k}=${[].concat(t[k]).join(',')}`).join(';');
}

export function addRating(data, target, { value, confidence = 'sure', source = 'learner', note }, { id = newId(), now = nowIso(), importId } = {}) {
  if (!target.unit) throw new Error('A rating needs a unit');
  if (!RATING_VALUES.includes(value)) throw new Error(`Unknown rating value: ${value}`);
  if (!CONFIDENCE.includes(confidence)) throw new Error(`Unknown confidence: ${confidence}`);
  const rating = { id, target: cleanTarget(target), value, confidence, source, at: now };
  if (note?.trim()) rating.note = note.trim();
  if (importId) rating.importId = importId;
  data.ratings.push(rating);
  return rating;
}

export function ratingHistory(data, target) {
  const key = targetKey(target);
  return data.ratings.filter((r) => targetKey(r.target) === key).sort((a, b) => a.at.localeCompare(b.at));
}

export function currentRatings(data, unitRef) {
  const latest = new Map();
  for (const r of data.ratings) {
    if (r.target.unit !== unitRef) continue;
    const key = targetKey(r.target);
    const prev = latest.get(key);
    if (!prev || r.at >= prev.at) latest.set(key, r);
  }
  return [...latest.entries()]
    .filter(([, r]) => r.value !== 'cleared')
    .map(([key, rating]) => ({ key, target: rating.target, rating }));
}
