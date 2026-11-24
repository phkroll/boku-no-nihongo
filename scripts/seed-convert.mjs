// Converts the provisional "linked-seed-1" graph into the app's import format (data version 2).
// Ambiguous seed content is kept as incomplete (e.g. gloss text stays one unsplit meaning).
import { emptyData, UNKNOWN } from '../js/model/data.js';

const RELATION_TYPE = {
  visual_similarity: 'looks-similar',
  reported_confusion: 'confuses',
  suspected_confusion: 'confuses',
  similar_meaning: 'similar-meaning',
  transitivity_pair: 'transitivity-pair',
};
// same_reading / same_writing_* are calculated by the app; contains/uses/recall edges are structure.
const ORIGIN = { candidate: { kind: 'suggested', detail: 'seed candidate' }, learner_report: { kind: 'learner' }, seed: { kind: 'learner', detail: 'seed' } };
const FACET = { writing: 'writing', kana: 'reading', sense: 'meaning', gloss: 'meaning' };
const READING_TYPE = { on: 'on', kun: 'kun' };
const UNIT_ORIGIN = { kind: 'learner', detail: 'linked-seed-1' };

const safeId = (s) => s.replace(/[:\s]/g, '-');
const isKatakana = (s) => /^[゠-ヿ]+$/.test(s);
const isKana = (s) => /^[぀-ヿ]+$/.test(s);
const looksCombined = (g) => /[,;、]/.test(g);
const prefix = (id) => id.slice(0, id.indexOf(':'));

// Ratings get a fixed date and ids derived from their target, so converting again and merging adds nothing.
const RATED_AT = '2026-11-24T00:00:00.000Z';

export function convertSeed(seed, { now = new Date().toISOString(), ratedAt = RATED_AT } = {}) {
  const nodes = new Map(seed.nodes.map((n) => [n.id, n]));
  const edges = seed.relationships;
  const edgeById = new Map(edges.map((e) => [e.id, e]));
  const from = (id, type) => edges.filter((e) => e.from === id && e.type === type);
  const text = (id) => nodes.get(id)?.text ?? nodes.get(id)?.gloss;
  const out = emptyData();
  const ref = new Map(); // seed id → app ref
  const skipped = [];
  const stamp = { origin: UNIT_ORIGIN, created: now, updated: now };

  const meaning = (unitId, gloss, i) => ({ id: `${unitId}-m${i + 1}`, gloss, ...(looksCombined(gloss) ? { unsplit: true } : {}) });

  for (const n of seed.nodes.filter((x) => x.type === 'kanji')) {
    const id = safeId(n.id);
    const k = { id, char: n.character, ...stamp };
    const readings = from(n.id, 'has_kanji_reading').map((e) => {
      const kana = text(e.to);
      const type = READING_TYPE[e.reading_type] ?? UNKNOWN;
      return { id: `${id}-${type}-${kana}`, kana, type };
    });
    if (readings.length) k.readings = readings;
    const glosses = from(n.id, 'has_gloss').map((e) => text(e.to));
    if (glosses.length) k.meanings = glosses.map((g, i) => meaning(id, g, i));
    out.kanji.push(k);
    ref.set(n.id, `kanji:${id}`);
  }

  const formChain = (f) => [
    ...(f.register === 'polite' ? ['polite'] : []),
    ...(f.polarity === 'negative' ? ['negative'] : []),
    ...(f.tense === 'past' ? ['past'] : []),
  ];

  for (const n of seed.nodes.filter((x) => x.type === 'word')) {
    const id = safeId(n.id);
    const writing = from(n.id, 'has_writing').map((e) => text(e.to))[0];
    const reading = from(n.id, 'has_reading').map((e) => text(e.to))[0];
    const w = { id, ...stamp };
    if (reading) w.reading = reading;
    if (writing && writing !== reading) w.writings = [{ text: writing }];
    if (writing && writing === reading && isKana(writing)) w.usuallyWritten = isKatakana(writing) ? 'katakana' : 'kana';
    const glosses = from(n.id, 'has_sense').map((e) => text(e.to)).filter(Boolean);
    if (glosses.length) w.meanings = glosses.map((g, i) => meaning(id, g, i));
    const cls = from(n.id, 'has_grammar_class').map((e) => nodes.get(e.to)?.label)[0];
    if (cls === 'ichidan') w.verbGroup = 'ru';
    if (cls === 'godan') w.verbGroup = 'u';
    if (w.verbGroup) w.wordClass = 'verb';
    const forms = from(n.id, 'has_form')
      .map((e) => nodes.get(e.to))
      .map((f) => ({ form: formChain(f), writing: from(f.id, 'has_writing').map((e) => text(e.to))[0], reading: from(f.id, 'has_reading').map((e) => text(e.to))[0] }))
      .filter((f) => f.form.length);
    if (forms.length) w.forms = forms;
    out.words.push(w);
    ref.set(n.id, `word:${id}`);
  }

  for (const n of seed.nodes.filter((x) => x.type === 'sentence')) {
    const id = safeId(n.id);
    const s = { id, text: from(n.id, 'has_writing').map((e) => text(e.to))[0], ...stamp };
    const reading = from(n.id, 'has_reading').map((e) => text(e.to))[0];
    const translation = from(n.id, 'has_gloss').map((e) => text(e.to))[0];
    if (reading) s.reading = reading;
    if (translation) s.translation = translation;
    const formIds = from(n.id, 'contains_form').map((e) => e.to);
    s.uses = from(n.id, 'contains_word').map((e) => {
      const form = formIds.filter((f) => f.startsWith(`form:${e.to}:`)).map((f) => formChain(nodes.get(f)))[0];
      return { wordId: safeId(e.to), ...(form?.length ? { form } : {}) };
    });
    out.sentences.push(s);
    ref.set(n.id, `sentence:${id}`);
  }

  // Relations: groups first, then pairwise edges not already covered by a group of the same type.
  const relationOf = new Map(); // seed edge/group id → relation
  const memberKey = (type, members) => `${type}|${[...members].sort().join('|')}`;
  const byKey = new Map();
  const addRelation = (seedId, type, members, source, direction) => {
    const key = memberKey(type, members);
    const existing = byKey.get(key);
    if (existing) {
      relationOf.set(seedId, existing);
      return existing;
    }
    const origin = ORIGIN[source] ?? { kind: 'learner', detail: source };
    const r = { id: safeId(seedId), type, members, origin, status: origin.kind === 'suggested' ? 'proposed' : 'confirmed', created: now, updated: now };
    if (direction) r.direction = direction;
    out.relations.push(r);
    byKey.set(key, r);
    relationOf.set(seedId, r);
    return r;
  };

  const groups = seed.nodes.filter((x) => x.type === 'relationship_group');
  for (const g of groups) {
    const type = RELATION_TYPE[g.relationship_type];
    if (!type) continue;
    const members = [...new Set(from(g.id, 'group_member').map((e) => ref.get(e.to)).filter(Boolean))];
    if (g.other_item_unknown) members.push(UNKNOWN);
    const real = members.filter((m) => m !== UNKNOWN);
    if (real.length < 2 && !(real.length === 1 && members.includes(UNKNOWN))) continue;
    addRelation(g.id, type, members, g.source);
  }
  for (const e of edges) {
    const type = RELATION_TYPE[e.type];
    if (!type) continue;
    const a = ref.get(e.from);
    const b = ref.get(e.to);
    if (!a || !b) continue;
    const direction = e.symmetric === false ? [a, b] : undefined;
    const group = out.relations.find((r) => r.type === type && r.members.includes(a) && r.members.includes(b) && r.origin.kind === (ORIGIN[e.source] ?? {}).kind);
    if (group) {
      relationOf.set(e.id, group);
      if (direction && group.members.length === 2) group.direction = direction;
      continue;
    }
    addRelation(e.id, type, [a, b], e.source, direction);
  }

  // Ratings: rough familiarity → estimate on the whole unit; learner reports → as precise as the seed says.
  const rating = (target, value, confidence, source, note) => {
    const key = [target.unit, target.from, target.to, source, value].filter(Boolean).join('-');
    const r = { id: safeId(`rating-${key}`), target, value, confidence, source, at: ratedAt };
    if (note) r.note = note;
    out.ratings.push(r);
  };
  for (const n of seed.nodes) {
    const unit = ref.get(n.id);
    if (!unit) continue;
    if (n.initial_familiarity === 'known') rating({ unit }, 'known', 'sure', 'estimate');
    if (n.initial_familiarity === 'probably_known') rating({ unit }, 'known', 'probably', 'estimate');
  }
  for (const pk of seed.personal_knowledge ?? []) {
    const e = edgeById.get(pk.relationship_id);
    const note = pk.scope;
    if (!e) {
      skipped.push(pk.relationship_id);
      continue;
    }
    if (pk.status === 'confused') {
      const r = relationOf.get(e.id) ?? relationOf.get(e.from);
      if (r) {
        r.status = 'confirmed';
        r.origin = { kind: 'learner' };
      } else skipped.push(e.id);
      continue;
    }
    const value = { known: 'known', difficult: 'partly' }[pk.status];
    if (!value) {
      skipped.push(e.id);
      continue;
    }
    if (e.type === 'has_gloss' || e.type === 'has_sense') {
      rating({ unit: ref.get(e.from), to: 'meaning' }, value, 'sure', 'learner', note);
    } else if (e.type.startsWith('recall:')) {
      const unit = ref.get(e.type.slice('recall:'.length));
      rating({ unit, from: FACET[prefix(e.from)], to: FACET[prefix(e.to)] }, value, 'sure', 'learner', note);
    } else if (e.type === 'recognition_difficulty') {
      rating({ unit: ref.get(e.to), from: FACET[prefix(e.from)] }, value, 'sure', 'learner', note);
    } else skipped.push(e.id);
  }

  out.meta = { convertedFrom: seed.schema_version, skipped };
  return out;
}
