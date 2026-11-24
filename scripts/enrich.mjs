// Enriches app data from reference sources (KANJIDIC2, JmdictFurigana, JMdict, Kanjium, Tatoeba).
// Fills only fields the model has; never overwrites, never adds readings, ratings or words.
// Sources come in parsed; reading files is run-enrich.mjs's job. Output = app import file (merge).
import { emptyData, normalize, firstWriting, UNKNOWN } from '../js/model/data.js';

const hira = (s) => normalize(s);
const isKanji = (c) => /[㐀-鿿々]/.test(c);
const SMALL_TSU = 'っ';
const SOKUON_BASE = ['く', 'つ', 'ち', 'き'];
const UNVOICED = Object.fromEntries(
  [...'がぎぐげござじずぜぞだぢづでどばびぶべぼぱぴぷぺぽ'].map((c, i) => [c, 'かきくけこさしすせそたちつてとはひふへほはひふへほ'[i]]),
);

// ---- Kanji reading types -----------------------------------------------------------------

// KANJIDIC2 character → { on: Set, kun: Set } of hiragana forms: full (あく) and stem (あ of あ.く).
export function kanjidicReadings(character) {
  const out = { on: new Set(), kun: new Set() };
  for (const g of character.readingMeaning?.groups ?? []) {
    for (const r of g.readings) {
      const type = r.type === 'ja_on' ? 'on' : r.type === 'ja_kun' ? 'kun' : null;
      if (!type) continue;
      const v = hira(r.value).replace(/^-|-$/g, '');
      out[type].add(v.replace('.', ''));
      out[type].add(v.split('.')[0]);
    }
  }
  return out;
}

// → partial kanji records with the upgraded readings, and readings that stay unknown.
export function typeReadings(kanjiList, kanjidicByChar) {
  const units = [];
  const unresolved = [];
  for (const k of kanjiList) {
    const kd = kanjidicByChar.get(k.char);
    const typed = [];
    for (const r of k.readings ?? []) {
      if (r.type !== UNKNOWN) continue;
      const types = kd ? ['on', 'kun'].filter((t) => kd[t].has(hira(r.kana))) : [];
      if (types.length === 1) typed.push({ id: r.id, kana: r.kana, type: types[0] });
      else unresolved.push(`${k.char} ${r.kana}: ${types.length ? 'on and kun' : 'not in KANJIDIC'}`);
    }
    if (typed.length) units.push({ id: k.id, char: k.char, readings: typed });
  }
  return { units, unresolved };
}

// ---- Kanji uses ---------------------------------------------------------------------------

// Reading of ours the dictionary reading `rt` stands for; `after` = kana following the kanji in the word.
function findReading(kanji, rt, after) {
  return (kanji?.readings ?? []).find((r) => {
    const kana = hira(r.kana);
    return kana === rt || (kana.startsWith(rt) && kana.length > rt.length && after.startsWith(kana.slice(rt.length)));
  });
}

function baseCandidates(rt) {
  const out = [];
  if (rt.endsWith(SMALL_TSU)) for (const b of SOKUON_BASE) out.push(rt.slice(0, -1) + b);
  if (UNVOICED[rt[0]]) out.push(UNVOICED[rt[0]] + rt.slice(1));
  return out;
}

// A kanji without any readings of ours gets the reading a word of ours uses (dictionary form, typed by
// KANJIDIC when it lists it). Kanji with readings get none added.
function addUsedReading(kanji, rt, after, kd) {
  const candidates = [rt, ...baseCandidates(rt)];
  const type = (kana) => (kd ? ['on', 'kun'].filter((t) => kd[t].has(kana)) : []);
  const known = candidates.find((c) => type(c).length === 1) ?? rt;
  const types = type(known);
  const reading = { id: `${kanji.id}-${types.length === 1 ? types[0] : UNKNOWN}-${known}`, kana: known, type: types.length === 1 ? types[0] : UNKNOWN };
  kanji.readings.push(reading);
  kanji.added.push(reading);
  return findReading(kanji, rt, after) ? { readingId: reading.id } : { readingId: reading.id, base: known };
}

// → { kanjiUses } or { wholeWordReading: true } or { skip: reason }.
// kanjiByChar: working copies { id, readings, open, added } (open = had no readings of ours).
export function kanjiUsesFor(word, furigana, kanjiByChar, kanjidicByChar = new Map()) {
  const segs = furigana.furigana;
  const kanjiSegs = segs.filter((s) => [...s.ruby].some(isKanji));
  if (kanjiSegs.some((s) => [...s.ruby].length > 1)) {
    return kanjiSegs.length === 1 ? { wholeWordReading: true } : { skip: 'reading spans several kanji' };
  }
  const uses = [];
  let prev = '';
  segs.forEach((s, i) => {
    if (!isKanji(s.ruby)) return;
    const char = s.ruby === '々' ? prev : s.ruby;
    prev = char;
    const rt = hira(s.rt ?? '');
    const after = segs.slice(i + 1).map((x) => (isKanji(x.ruby) ? '' : hira(x.ruby))).join('');
    const kanji = kanjiByChar.get(char);
    const use = { char, reading: rt };
    const direct = findReading(kanji, rt, after);
    if (direct) use.readingId = direct.id;
    else {
      for (const base of baseCandidates(rt)) {
        const r = findReading(kanji, base, after);
        if (r) {
          Object.assign(use, { readingId: r.id, base });
          break;
        }
      }
      if (!use.readingId && kanji?.open) Object.assign(use, addUsedReading(kanji, rt, after, kanjidicByChar.get(char)));
      if (use.base === rt) delete use.base;
    }
    uses.push(use);
  });
  return { kanjiUses: uses };
}

export function enrichKanjiUses(words, furiganaByKey, kanjiByChar, kanjidicByChar) {
  const units = [];
  const skipped = [];
  for (const w of words) {
    const writing = firstWriting(w);
    if (!writing || !w.reading || w.kanjiUses || w.wholeWordReading !== undefined) continue;
    if (![...writing].some(isKanji)) continue;
    const f = furiganaByKey.get(`${writing}|${hira(w.reading)}`);
    if (!f) {
      skipped.push(`${writing} ${w.reading}: no furigana`);
      continue;
    }
    const res = kanjiUsesFor(w, f, kanjiByChar, kanjidicByChar);
    if (res.skip) skipped.push(`${writing} ${w.reading}: ${res.skip}`);
    else units.push({ id: w.id, reading: w.reading, writings: w.writings, ...res });
  }
  return { units, skipped };
}

// ---- Relations ----------------------------------------------------------------------------

// Kanjium lookalikes ("char\tlist") between two of our kanji, not yet together in a looks-similar relation.
export function lookalikeRelations(kanjiList, lookalikeLines, relations, now) {
  const byChar = new Map(kanjiList.map((k) => [k.char, k]));
  const together = (a, b) => relations.some((r) => r.type === 'looks-similar' && r.members.includes(a) && r.members.includes(b));
  const seen = new Set();
  const out = [];
  for (const line of lookalikeLines) {
    const [c, list] = line.split('\t');
    if (!byChar.has(c) || !list) continue;
    for (const o of list.split(',').map((x) => x.trim())) {
      if (!byChar.has(o) || o === c) continue;
      const [a, b] = [c, o].sort();
      const key = a + b;
      const ra = `kanji:${byChar.get(a).id}`;
      const rb = `kanji:${byChar.get(b).id}`;
      if (seen.has(key) || together(ra, rb)) continue;
      seen.add(key);
      out.push({
        id: `kanjium-${a}-${b}`, type: 'looks-similar', members: [ra, rb], status: 'proposed',
        origin: { kind: 'suggested', detail: 'Kanjium lookalikes' }, created: now, updated: now,
      });
    }
  }
  return out;
}

// ---- Sentences ----------------------------------------------------------------------------

// Tatoeba B-line token: headword(reading)[sense]{form}~ ; "(#123)" is a JMdict id, not a reading.
export function parseToken(t) {
  const m = /^([^([{~]+)(?:\(([^)]*)\))?(?:\[(\d+)\])?(?:\{([^}]*)\})?(~)?$/.exec(t);
  if (!m) return null;
  const reading = m[2] && !m[2].startsWith('#') ? hira(m[2]) : undefined;
  return { head: m[1], reading, form: m[4], checked: Boolean(m[5]) };
}

// "[漢字|かん|じ]です" → "かんじです"
export function furiganaReading(s) {
  return s.replace(/\[([^|\]]+)((?:\|[^|\]]*)+)\]/g, (_, _k, rs) => rs.split('|').join(''));
}

// index: [{ jpn, eng, tokens }] ; texts: Map jpn id → text ; eng: Map eng id → text ;
// transcriptions: Map jpn id → furigana text ; writingsInDictionary: Map writing → number of JMdict entries.
export function exampleSentences(words, { index, texts, eng, transcriptions, writingsInDictionary }, now) {
  const ours = words
    .map((w) => ({ w, writing: firstWriting(w), reading: hira(w.reading) }))
    .filter((x) => x.writing && [...x.writing].some(isKanji));
  const byHead = new Map();
  for (const x of ours) byHead.set(x.writing, [...(byHead.get(x.writing) ?? []), x]);
  const fits = (x, tok) => (tok.reading ? tok.reading === x.reading : (writingsInDictionary.get(x.writing) ?? 0) === 1);

  const best = new Map(); // word id → line
  for (const line of index) {
    if (!texts.has(line.jpn) || !eng.has(line.eng)) continue;
    for (const tok of line.tokens) {
      if (!tok.checked) continue;
      for (const x of byHead.get(tok.head) ?? []) {
        if (!fits(x, tok)) continue;
        const cur = best.get(x.w.id);
        const len = texts.get(line.jpn).length;
        if (!cur || len < texts.get(cur.jpn).length || (len === texts.get(cur.jpn).length && line.jpn < cur.jpn)) best.set(x.w.id, line);
      }
    }
  }

  const sentences = new Map();
  for (const line of best.values()) {
    if (sentences.has(line.jpn)) continue;
    const uses = [];
    const forms = [];
    for (const tok of line.tokens) {
      for (const x of byHead.get(tok.head) ?? []) {
        if (!fits(x, tok) || uses.some((u) => u.wordId === x.w.id)) continue;
        uses.push({ wordId: x.w.id });
        if (tok.form && tok.form !== tok.head) forms.push(`${tok.head} → ${tok.form}`);
      }
    }
    const s = {
      id: `tatoeba-${line.jpn}`, text: texts.get(line.jpn), translation: eng.get(line.eng), uses,
      origin: { kind: 'reference', detail: `Tatoeba #${line.jpn}` }, created: now, updated: now,
    };
    const furi = transcriptions.get(line.jpn);
    if (furi) s.reading = furiganaReading(furi);
    if (forms.length) s.notes = `Forms in this sentence: ${forms.join(', ')}`;
    sentences.set(line.jpn, s);
  }
  const without = ours.filter((x) => !best.has(x.w.id)).map((x) => `${x.writing} ${x.w.reading}`);
  return { sentences: [...sentences.values()], without };
}

// ---- Review list (JMdict) -----------------------------------------------------------------

const CLASS = {
  v1: 'verb', v5: 'verb', vk: 'verb', 'vs-i': 'verb', 'adj-i': 'i-adjective', 'adj-na': 'na-adjective',
  n: 'noun', adv: 'adverb', prt: 'particle', pn: 'pronoun', conj: 'conjunction', exp: 'expression', ctr: 'counter',
};
const classOf = (pos) => CLASS[pos] ?? CLASS[pos.replace(/^(v5).*/, '$1')];

export function reviewWords(words, jmdictByKey) {
  const lines = [];
  for (const w of words) {
    const writing = firstWriting(w);
    const label = `${writing || '-'} ${w.reading ?? ''}`;
    const entries = jmdictByKey.get(`${writing || hira(w.reading)}|${hira(w.reading)}`) ?? [];
    if (entries.length !== 1) {
      lines.push(`${label}: ${entries.length ? `${entries.length} dictionary entries` : 'not in dictionary'}`);
      continue;
    }
    const allPos = new Set(entries[0].sense.flatMap((s) => s.partOfSpeech));
    const first = entries[0].sense[0].partOfSpeech.map(classOf).filter(Boolean);
    if (allPos.has('vs') && w.suru !== true) lines.push(`${label}: dictionary says it takes する`);
    if (w.wordClass && w.wordClass !== UNKNOWN && first.length && !first.includes(w.wordClass)) {
      lines.push(`${label}: class ${w.wordClass}, dictionary ${[...new Set(first)].join(' / ')}`);
    }
    if (allPos.has('v5r-i') || allPos.has('v5k-s')) lines.push(`${label}: godan with an irregular form (${[...allPos].filter((p) => p.startsWith('v5')).join(', ')})`);
  }
  return lines;
}

// ---- All together -------------------------------------------------------------------------

export function enrich(data, src, { now = new Date().toISOString() } = {}) {
  const readings = typeReadings(data.kanji, src.kanjidicByChar);
  const kanjiByChar = new Map(data.kanji.map((k) => [k.char, {
    id: k.id, char: k.char, readings: [...(k.readings ?? [])], open: !(k.readings ?? []).length, added: [],
  }]));
  const uses = enrichKanjiUses(data.words, src.furiganaByKey, kanjiByChar, src.kanjidicByChar);
  const relations = lookalikeRelations(data.kanji, src.lookalikeLines, data.relations, now);
  const sentences = exampleSentences(data.words, src.tatoeba, now);
  const out = emptyData();
  const added = [...kanjiByChar.values()].filter((k) => k.added.length).map((k) => ({ id: k.id, char: k.char, readings: k.added }));
  out.kanji = [...readings.units, ...added];
  out.words = uses.units;
  out.relations = relations;
  out.sentences = sentences.sentences;
  out.meta = { enrichedAt: now, sources: src.versions };
  const review = [
    '# Words to check against JMdict', ...reviewWords(data.words, src.jmdictByKey),
    '', '# Kanji readings left unknown', ...readings.unresolved,
    '', '# Words without kanji uses', ...uses.skipped,
    '', '# Words without a checked example sentence', ...sentences.without,
  ];
  return { data: out, review };
}
