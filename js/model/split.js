// Splits data into publishable learning content and personal knowledge (decision by user:
// both published for now; later only content — then data/knowledge.json is simply removed).
import { VERSION, emptyData } from './data.js';

const PERSONAL_RELATION = (r) => r.type === 'confuses';

export function splitData(data) {
  const content = {
    ...emptyData(),
    kanji: data.kanji,
    words: data.words,
    grammar: data.grammar.filter((g) => g.origin?.kind !== 'reference'), // starter forms ship with the app
    sentences: data.sentences,
    relations: data.relations.filter((r) => !PERSONAL_RELATION(r)),
    tags: data.tags,
  };
  const knowledge = {
    ...emptyData(),
    notes: data.notes,
    relations: data.relations.filter(PERSONAL_RELATION),
    ratings: data.ratings,
  };
  return { content: { ...content, version: VERSION }, knowledge: { ...knowledge, version: VERSION } };
}
