// Content of the starter grammar points, written for this app (Tae Kim's guide used as a reference only).
// Form steps by formKey; further grammar points by starterKey. Examples use words from the collection.
export const CONTENT_VERSION = 1;

const VERBS = 'verbs';

export const FORM_CONTENT = {
  polite: {
    pattern: 'stem + ます',
    meaning: 'polite style (neutral, for strangers and work)',
    appliesTo: VERBS,
    explanation: [
      'Stem: ru-verb drops る (寝る → 寝ます); u-verb changes the last u-sound to i (書く → 書きます, 話す → 話します).',
      'Irregular: する → します, 来る → きます.',
      'ます → ません (negative), ました (past), ませんでした (past negative).',
    ].join('\n'),
  },
  negative: {
    pattern: '〜ない',
    meaning: 'plain negative: not do',
    appliesTo: 'verbs; i-adjectives い → くない; nouns, na-adjectives + じゃない',
    explanation: [
      'ru-verb: drop る + ない (食べる → 食べない).',
      'u-verb: last u-sound → a + ない (書く → 書かない); う becomes わ (買う → 買わない).',
      'Irregular: する → しない, 来る → こない, ある → ない.',
      'The result works like an i-adjective: ない → なかった (past).',
    ].join('\n'),
  },
  past: {
    pattern: '〜た / 〜だ',
    meaning: 'plain past: did',
    appliesTo: 'verbs; i-adjectives い → かった; nouns, na-adjectives + だった',
    explanation: [
      'ru-verb: drop る + た (寝る → 寝た).',
      'u-verb by ending: う つ る → った (買った, 待った); む ぶ ぬ → んだ (読んだ, 遊んだ); く → いた (書いた); ぐ → いだ; す → した (話した).',
      'Irregular: 行く → 行った, する → した, 来る → きた.',
    ].join('\n'),
  },
  te: {
    pattern: '〜て / 〜で',
    meaning: 'te-form: links actions; base for requests and 〜ている',
    appliesTo: 'verbs; i-adjectives い → くて; nouns, na-adjectives + で',
    explanation: [
      'Built from the past: た → て, だ → で (食べた → 食べて, 読んだ → 読んで, 行った → 行って).',
      'Uses: one action after another (起きて、食べる), requests (〜てください), 〜ている, 〜てもいい.',
    ].join('\n'),
  },
  potential: {
    pattern: '〜られる / 〜える',
    meaning: 'can do',
    appliesTo: VERBS,
    explanation: [
      'ru-verb: drop る + られる (食べられる; spoken often 食べれる).',
      'u-verb: last u-sound → e + る (書ける, 話せる, 行ける).',
      'Irregular: する → できる, 来る → こられる.',
      'The thing one can do often takes が instead of を. The result conjugates like a ru-verb.',
    ].join('\n'),
  },
  passive: {
    pattern: '〜られる / 〜れる',
    meaning: 'is done (to someone)',
    appliesTo: VERBS,
    explanation: [
      'ru-verb: drop る + られる (same form as the potential: 食べられる).',
      'u-verb: last u-sound → a + れる (読まれる); う becomes わ (言われる).',
      'Irregular: する → される, 来る → こられる.',
      'The doer takes に. Also used when something unpleasant happens to someone.',
    ].join('\n'),
  },
  causative: {
    pattern: '〜させる / 〜せる',
    meaning: 'make or let someone do',
    appliesTo: VERBS,
    explanation: [
      'ru-verb: drop る + させる (食べさせる).',
      'u-verb: last u-sound → a + せる (書かせる); う becomes わ (買わせる).',
      'Irregular: する → させる, 来る → こさせる.',
      'The person made or allowed to act takes に or を.',
    ].join('\n'),
  },
  'causative-passive': {
    pattern: '〜させられる',
    meaning: 'be made to do',
    appliesTo: VERBS,
    explanation: [
      'Causative, then passive: 食べさせる → 食べさせられる.',
      'u-verbs mostly use a short form: 書かせられる → 書かされる; not for verbs ending in す (話させられる).',
      'Irregular: する → させられる, 来る → こさせられる.',
    ].join('\n'),
  },
  volitional: {
    pattern: '〜よう / 〜おう',
    meaning: "let's …; I'll …",
    appliesTo: VERBS,
    explanation: [
      'ru-verb: drop る + よう (寝よう).',
      'u-verb: last u-sound → o + う (行こう, 飲もう).',
      'Irregular: する → しよう, 来る → こよう. Polite: 〜ましょう.',
      '〜ようと思う: I think I will …',
    ].join('\n'),
  },
  imperative: {
    pattern: '〜ろ / 〜え',
    meaning: 'blunt command: do!',
    appliesTo: VERBS,
    explanation: [
      'ru-verb: drop る + ろ (寝ろ). u-verb: last u-sound → e (書け, 行け).',
      'Irregular: する → しろ, 来る → こい.',
      'Rude in most situations; softer: 〜なさい, 〜て, 〜てください.',
    ].join('\n'),
  },
  'conditional-ba': {
    pattern: '〜ば',
    meaning: 'if (focus on the condition)',
    appliesTo: 'verbs; i-adjectives い → ければ; nouns, na-adjectives + なら(ば)',
    explanation: [
      'Verb: last u-sound → e + ば (行けば, 食べれば). する → すれば, 来る → くれば.',
      'Stresses what must be true for the result: if (and only if) …',
      'Compare: たら, と, なら.',
    ].join('\n'),
  },
  'conditional-tara': {
    pattern: '〜たら',
    meaning: 'if / when (focus on what happens after)',
    appliesTo: 'verbs, adjectives, nouns: past + ら',
    explanation: [
      'Past form + ら (食べたら, 行ったら, 高かったら, 雨だったら).',
      'The most general "if"; also "when … (has happened)". The only conditional whose result can be in the past.',
      'Compare: ば, と, なら.',
    ].join('\n'),
  },
  'desire-tai': {
    pattern: 'stem + たい',
    meaning: 'want to do (speaker)',
    appliesTo: VERBS,
    explanation: [
      'Stem as for ます + たい (食べたい, 行きたい).',
      'Works like an i-adjective: たくない, たかった.',
      'For one\'s own wish; for other people 〜たがる or 〜たいそうです. The object can take が or を.',
    ].join('\n'),
  },
  'progressive-teiru': {
    pattern: 'te-form + いる',
    meaning: 'is doing; is in a state',
    appliesTo: VERBS,
    explanation: [
      'te-form + いる (読んでいる, 寝ている); spoken often 〜てる.',
      'Action verbs: ongoing action. Change verbs: resulting state (開いている: is open).',
      'Conjugates like a ru-verb (〜ていた, 〜ています).',
    ].join('\n'),
  },
};

// Grammar points that are no form step; added like the form steps, identified by starterKey.
export const EXTRA_GRAMMAR = [
  {
    starterKey: 'reason-kara',
    title: 'Reason から',
    pattern: '[reason] から [result]',
    meaning: 'because, so',
    appliesTo: 'plain or polite form + から; nouns, na-adjectives + だから',
    explanation: [
      'States the speaker\'s own reason directly (雨だから、行かない).',
      'Fine with requests, wishes and intentions in the result.',
      'Compare: ので (softer).',
    ].join('\n'),
  },
  {
    starterKey: 'reason-node',
    title: 'Reason ので',
    pattern: '[reason] ので [result]',
    meaning: 'because, since (softer)',
    appliesTo: 'plain form + ので; nouns, na-adjectives + なので',
    explanation: [
      'Presents the reason as a fact; sounds softer and more polite than から.',
      'Preferred for explanations and apologies (電車が止まったので、遅れました).',
      'Compare: から.',
    ].join('\n'),
  },
  {
    starterKey: 'conditional-to',
    title: 'Conditional と',
    pattern: '[plain non-past] と [result]',
    meaning: 'whenever / if … then naturally',
    appliesTo: 'verbs, adjectives; nouns, na-adjectives + だと',
    explanation: [
      'A natural, automatic consequence (ボタンを押すと、ドアが開く).',
      'The result is no request, wish or intention.',
      'Compare: ば, たら, なら.',
    ].join('\n'),
  },
  {
    starterKey: 'conditional-nara',
    title: 'Conditional なら',
    pattern: '[context] なら [result]',
    meaning: 'if (it is the case that) …',
    appliesTo: 'plain form + なら; nouns, na-adjectives + なら directly',
    explanation: [
      'Takes up a topic or situation, often one someone else raised, and comments on it (京都に行くなら、秋がいい).',
      'Typical for advice.',
      'Compare: ば, たら, と.',
    ].join('\n'),
  },
];
