// Relations between units, and keeping references consistent when units go away.
import { parseRef } from './data.js';

export function removeUnitReferences(data, ref) {
  data.ratings = data.ratings.filter((r) => r.target.unit !== ref);
}

export function clearReadingUses(data, readingId) {
  for (const w of data.words) for (const use of w.kanjiUses ?? []) if (use.readingId === readingId) delete use.readingId;
}

export const _parse = parseRef;
