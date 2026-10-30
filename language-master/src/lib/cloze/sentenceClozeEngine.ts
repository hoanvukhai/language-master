// src/lib/cloze/sentenceClozeEngine.ts
// Engine đục lỗ câu ví dụ thông minh cho tất cả ngôn ngữ (English, Japanese, v.v.)
// - Xử lý động từ bất quy tắc tiếng Anh (strike -> struck, hang -> hung, catch -> caught...)
// - Xử lý biến đổi hình thái: bỏ e câm (breathe -> breathing), y -> i (hurry -> hurried, deny -> denies)
// - Xử lý cụm động từ (phrasal verbs) có chia thì hoặc xen đại từ (call off -> called off, call you back)
// - Xử lý danh từ số nhiều bất quy tắc (wolf -> wolves, leaf -> leaves)
// - Hỗ trợ tiếng Nhật (từ ghép Kanji, Hiragana substring)
// - TUYỆT ĐỐI KHÔNG BAO GIỜ gắn [ _____ ] vào đuôi câu khi không tìm thấy từ!

export interface MaskResult {
  maskedSentence: string;
  maskedWord: string;
}

// Bảng động từ bất quy tắc tiếng Anh phổ biến nhất
export const ENGLISH_IRREGULAR_VERBS: Record<string, string[]> = {
  arise: ['arose', 'arisen'],
  awake: ['awoke', 'awoken'],
  bear: ['bore', 'born', 'borne'],
  beat: ['beat', 'beaten'],
  become: ['became', 'becomes', 'becoming'],
  begin: ['began', 'begun', 'begins', 'beginning'],
  bend: ['bent', 'bends', 'bending'],
  bet: ['bet', 'bets', 'betting'],
  bid: ['bid', 'bade', 'bidden'],
  bind: ['bound', 'binds', 'binding'],
  bite: ['bit', 'bitten', 'bites', 'biting'],
  bleed: ['bled', 'bleeds', 'bleeding'],
  blow: ['blew', 'blown', 'blows', 'blowing'],
  break: ['broke', 'broken', 'breaks', 'breaking'],
  breed: ['bred', 'breeds', 'breeding'],
  bring: ['brought', 'brings', 'bringing'],
  build: ['built', 'builds', 'building'],
  burn: ['burnt', 'burned', 'burns', 'burning'],
  burst: ['burst', 'bursts', 'bursting'],
  buy: ['bought', 'buys', 'buying'],
  cast: ['cast', 'casts', 'casting'],
  catch: ['caught', 'catches', 'catching'],
  choose: ['chose', 'chosen', 'chooses', 'choosing'],
  cling: ['clung', 'clings', 'clinging'],
  come: ['came', 'comes', 'coming'],
  cost: ['cost', 'costs', 'costing'],
  creep: ['crept', 'creeps', 'creeping'],
  cut: ['cut', 'cuts', 'cutting'],
  deal: ['dealt', 'deals', 'dealing'],
  dig: ['dug', 'digs', 'digging'],
  dive: ['dove', 'dived', 'dives', 'diving'],
  do: ['did', 'done', 'does', 'doing'],
  draw: ['drew', 'drawn', 'draws', 'drawing'],
  dream: ['dreamt', 'dreamed', 'dreams', 'dreaming'],
  drink: ['drank', 'drunk', 'drinks', 'drinking'],
  drive: ['drove', 'driven', 'drives', 'driving'],
  eat: ['ate', 'eaten', 'eats', 'eating'],
  fall: ['fell', 'fallen', 'falls', 'falling'],
  feed: ['fed', 'feeds', 'feeding'],
  feel: ['felt', 'feels', 'feeling'],
  fight: ['fought', 'fights', 'fighting'],
  find: ['found', 'finds', 'finding'],
  flee: ['fled', 'flees', 'fleeing'],
  fling: ['flung', 'flings', 'flinging'],
  fly: ['flew', 'flown', 'flies', 'flying'],
  forbid: ['forbade', 'forbidden', 'forbids', 'forbidding'],
  forget: ['forgot', 'forgotten', 'forgets', 'forgetting'],
  forgive: ['forgave', 'forgiven', 'forgives', 'forgiving'],
  freeze: ['froze', 'frozen', 'freezes', 'freezing'],
  get: ['got', 'gotten', 'gets', 'getting'],
  give: ['gave', 'given', 'gives', 'giving'],
  go: ['went', 'gone', 'goes', 'going'],
  grind: ['ground', 'grinds', 'grinding'],
  grow: ['grew', 'grown', 'grows', 'growing'],
  hang: ['hung', 'hanged', 'hangs', 'hanging'],
  have: ['had', 'has', 'having'],
  hear: ['heard', 'hears', 'hearing'],
  hide: ['hid', 'hidden', 'hides', 'hiding'],
  hit: ['hit', 'hits', 'hitting'],
  hold: ['held', 'holds', 'holding'],
  hurt: ['hurt', 'hurts', 'hurting'],
  keep: ['kept', 'keeps', 'keeping'],
  kneel: ['knelt', 'kneeled', 'kneels', 'kneeling'],
  know: ['knew', 'known', 'knows', 'knowing'],
  lay: ['laid', 'lays', 'laying'],
  lead: ['led', 'leads', 'leading'],
  lean: ['leant', 'leaned', 'leans', 'leaning'],
  leap: ['leapt', 'leaped', 'leaps', 'leaping'],
  learn: ['learnt', 'learned', 'learns', 'learning'],
  leave: ['left', 'leaves', 'leaving'],
  lend: ['lent', 'lends', 'lending'],
  let: ['let', 'lets', 'letting'],
  lie: ['lay', 'lain', 'lying', 'lies'],
  light: ['lit', 'lighted', 'lights', 'lighting'],
  lose: ['lost', 'loses', 'losing'],
  make: ['made', 'makes', 'making'],
  mean: ['meant', 'means', 'meaning'],
  meet: ['met', 'meets', 'meeting'],
  overcome: ['overcame', 'overcomes', 'overcoming'],
  pay: ['paid', 'pays', 'paying'],
  put: ['put', 'puts', 'putting'],
  quit: ['quit', 'quits', 'quitting'],
  read: ['read', 'reads', 'reading'],
  ride: ['rode', 'ridden', 'rides', 'riding'],
  ring: ['rang', 'rung', 'rings', 'ringing'],
  rise: ['rose', 'risen', 'rises', 'rising'],
  run: ['ran', 'runs', 'running'],
  say: ['said', 'says', 'saying'],
  see: ['saw', 'seen', 'sees', 'seeing'],
  seek: ['sought', 'seeks', 'seeking'],
  sell: ['sold', 'sells', 'selling'],
  send: ['sent', 'sends', 'sending'],
  set: ['set', 'sets', 'setting'],
  sew: ['sewed', 'sewn', 'sews', 'sewing'],
  shake: ['shook', 'shaken', 'shakes', 'shaking'],
  shine: ['shone', 'shined', 'shines', 'shining'],
  shoot: ['shot', 'shoots', 'shooting'],
  show: ['showed', 'shown', 'shows', 'showing'],
  shrink: ['shrank', 'shrunk', 'shrinks', 'shrinking'],
  shut: ['shut', 'shuts', 'shutting'],
  sing: ['sang', 'sung', 'sings', 'singing'],
  sink: ['sank', 'sunk', 'sinks', 'sinking'],
  sit: ['sat', 'sits', 'sitting'],
  sleep: ['slept', 'sleeps', 'sleeping'],
  slide: ['slid', 'slides', 'sliding'],
  slit: ['slit', 'slits', 'slitting'],
  sneak: ['snuck', 'sneaked', 'sneaks', 'sneaking'],
  speak: ['spoke', 'spoken', 'speaks', 'speaking'],
  speed: ['sped', 'speeded', 'speeds', 'speeding'],
  spend: ['spent', 'spends', 'spending'],
  spin: ['spun', 'spins', 'spinning'],
  spit: ['spat', 'spit', 'spits', 'spitting'],
  split: ['split', 'splits', 'splitting'],
  spread: ['spread', 'spreads', 'spreading'],
  spring: ['sprang', 'sprung', 'springs', 'springing'],
  stand: ['stood', 'stands', 'standing'],
  steal: ['stole', 'stolen', 'steals', 'stealing'],
  stick: ['stuck', 'sticks', 'sticking'],
  sting: ['stung', 'stings', 'stinging'],
  stink: ['stank', 'stunk', 'stinks', 'stinking'],
  stride: ['strode', 'stridden', 'strides', 'striding'],
  strike: ['struck', 'stricken', 'strikes', 'striking'],
  string: ['strung', 'strings', 'stringing'],
  strive: ['strove', 'striven', 'strives', 'striving'],
  swear: ['swore', 'sworn', 'swears', 'swearing'],
  sweep: ['swept', 'sweeps', 'sweeping'],
  swim: ['swam', 'swum', 'swims', 'swimming'],
  swing: ['swung', 'swings', 'swinging'],
  take: ['took', 'taken', 'takes', 'taking'],
  teach: ['taught', 'teaches', 'teaching'],
  tear: ['tore', 'torn', 'tears', 'tearing'],
  tell: ['told', 'tells', 'telling'],
  think: ['thought', 'thinks', 'thinking'],
  throw: ['threw', 'thrown', 'throws', 'throwing'],
  thrust: ['thrust', 'thrusts', 'thrusting'],
  tread: ['trod', 'trodden', 'treads', 'treading'],
  understand: ['understood', 'understands', 'understanding'],
  undertake: ['undertook', 'undertaken', 'undertakes', 'undertaking'],
  upset: ['upset', 'upsets', 'upsetting'],
  wake: ['woke', 'woken', 'wakes', 'waking'],
  wear: ['wore', 'worn', 'wears', 'wearing'],
  weave: ['wove', 'woven', 'weaves', 'weaving'],
  weep: ['wept', 'weeps', 'weeping'],
  win: ['won', 'wins', 'winning'],
  wind: ['wound', 'winds', 'winding'],
  withdraw: ['withdrew', 'withdrawn', 'withdraws', 'withdrawing'],
  wring: ['wrung', 'wrings', 'wringing'],
  write: ['wrote', 'written', 'writes', 'writing']
};

// Danh từ số nhiều bất quy tắc
export const IRREGULAR_PLURALS: Record<string, string> = {
  child: 'children',
  man: 'men',
  woman: 'women',
  person: 'people',
  tooth: 'teeth',
  foot: 'feet',
  mouse: 'mice',
  goose: 'geese',
  wolf: 'wolves',
  leaf: 'leaves',
  life: 'lives',
  knife: 'knives',
  wife: 'wives',
  half: 'halves',
  thief: 'thieves',
  shelf: 'shelves',
  loaf: 'loaves',
  calf: 'calves',
  millennium: 'millennia',
  criterion: 'criteria',
  phenomenon: 'phenomena'
};

/**
 * Đục lỗ từ mục tiêu trong câu ví dụ một cách thông minh và chính xác.
 * Trả về { maskedSentence, maskedWord } nếu tìm thấy vị trí từ trong câu.
 * Trả về null nếu không tìm thấy (TUYỆT ĐỐI không gắn bừa [ _____ ] vào đuôi câu).
 */
export function maskTargetInSentence(sentence: string, targetWord: string): MaskResult | null {
  if (!sentence || !targetWord) return null;
  const rawTarget = targetWord.trim();

  // Tách các biến thể nếu target có dấu phẩy hoặc gạch chéo (VD: "mother, mom" hoặc "centre / center")
  const variants = rawTarget.split(/[,/|;]+/).map(v => v.trim()).filter(Boolean);
  if (variants.length === 0) variants.push(rawTarget);

  for (const variant of variants) {
    const res = maskSingleTarget(sentence, variant);
    if (res) return res;
  }

  return null;
}

function maskSingleTarget(sentence: string, targetWord: string): MaskResult | null {
  const cleanTarget = targetWord.trim();
  if (!cleanTarget) return null;

  // 1. Khớp chính xác hoặc các hậu tố thông thường: (e.g. "clear" -> "clear", "cleared", "clearing", "clears")
  const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regExact = new RegExp(`\\b${escaped}[a-z]*\\b`, 'i');
  let match = sentence.match(regExact);
  if (match) {
    return {
      maskedSentence: sentence.replace(regExact, '[ _____ ]'),
      maskedWord: match[0]
    };
  }

  const lower = cleanTarget.toLowerCase();

  // 2. Động từ bất quy tắc (e.g. "strike" -> "struck", "hang" -> "hung", "catch" -> "caught")
  const irrForms = ENGLISH_IRREGULAR_VERBS[lower];
  if (irrForms && irrForms.length > 0) {
    for (const form of irrForms) {
      const regIrr = new RegExp(`\\b${form}\\b`, 'i');
      match = sentence.match(regIrr);
      if (match) {
        return {
          maskedSentence: sentence.replace(regIrr, '[ _____ ]'),
          maskedWord: match[0]
        };
      }
    }
  }

  // 3. Danh từ số nhiều bất quy tắc (e.g. "wolf" -> "wolves", "leaf" -> "leaves", "child" -> "children")
  const pluralForm = IRREGULAR_PLURALS[lower];
  if (pluralForm) {
    const regPlural = new RegExp(`\\b${pluralForm}\\b`, 'i');
    match = sentence.match(regPlural);
    if (match) {
      return {
        maskedSentence: sentence.replace(regPlural, '[ _____ ]'),
        maskedWord: match[0]
      };
    }
  }

  // 4. Bỏ đuôi 'e' câm (e.g. "breathe" -> "breathing", "organize" -> "organizing", "save" -> "saving")
  if (cleanTarget.length > 3 && lower.endsWith('e')) {
    const stem = cleanTarget.slice(0, -1);
    const stemEsc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regStem = new RegExp(`\\b${stemEsc}[a-z]+\\b`, 'i');
    match = sentence.match(regStem);
    if (match) {
      return {
        maskedSentence: sentence.replace(regStem, '[ _____ ]'),
        maskedWord: match[0]
      };
    }
  }

  // 5. Biến đổi 'y' thành 'i' (e.g. "hurry" -> "hurried", "deny" -> "denies", "bury" -> "buried")
  if (cleanTarget.length > 2 && lower.endsWith('y')) {
    const stem = cleanTarget.slice(0, -1);
    const stemEsc = stem.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regY = new RegExp(`\\b${stemEsc}i[a-z]*\\b`, 'i');
    match = sentence.match(regY);
    if (match) {
      return {
        maskedSentence: sentence.replace(regY, '[ _____ ]'),
        maskedWord: match[0]
      };
    }
  }

  // 6. Cụm từ nhiều chữ (Phrasal verbs hoặc idioms)
  const parts = cleanTarget.split(/\s+/);
  if (parts.length > 1) {
    const firstWord = parts[0].toLowerCase();
    const rest = parts.slice(1).map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('\\s+');
    const firstIrr = ENGLISH_IRREGULAR_VERBS[firstWord] || [];
    const allFirstForms = [firstWord, ...firstIrr];
    if (firstWord.endsWith('e')) allFirstForms.push(firstWord.slice(0, -1) + '[a-z]+');
    allFirstForms.push(firstWord + '[a-z]*');

    // Mẫu 1: Đi liền nhau có chia thì (e.g. "broke down", "calling off", "added up")
    const phrasePattern = `\\b(?:${allFirstForms.join('|')})\\s+${rest}\\b`;
    const regPhrase = new RegExp(phrasePattern, 'i');
    match = sentence.match(regPhrase);
    if (match) {
      return {
        maskedSentence: sentence.replace(regPhrase, '[ _____ ]'),
        maskedWord: match[0]
      };
    }

    // Mẫu 2: Phrasal verb có tân ngữ/đại từ xen giữa (e.g. "call you back", "bring her up")
    const splitPattern = `\\b(?:${allFirstForms.join('|')})\\s+[a-z']+\\s+${rest}\\b`;
    const regSplit = new RegExp(splitPattern, 'i');
    match = sentence.match(regSplit);
    if (match) {
      return {
        maskedSentence: sentence.replace(regSplit, '[ _____ ]'),
        maskedWord: match[0]
      };
    }
  }

  // 7. Substring fallback (Hỗ trợ tiếng Nhật, chữ Hán, Hiragana hoặc từ không phân tách word boundary)
  const regSub = new RegExp(escaped, 'i');
  match = sentence.match(regSub);
  if (match) {
    return {
      maskedSentence: sentence.replace(regSub, '[ _____ ]'),
      maskedWord: match[0]
    };
  }

  return null;
}

