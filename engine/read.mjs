// Step 4: read the words into phrases (beats), each with a role guess, a hero word, helper words and list items.
// Pure and deterministic: the director (direct.mjs) may confirm or change role and hero; nothing else needs a model.

const STOP = new Set(`a an the and or but so to of in on at for with from by is are was were be been am i you he she it we they me my your our their this that these those there here then than just only not do does did done have has had will would can could should what which who how why when where if as about into out up down over very really also like let lets let\'s now thing things one get got go going make making want okay yeah well first second third last lastly number step rather still that's it's i'm you're you'll we're they're don't can't won't isn't i've you've entire main any every everybody all some most more less same each other`.split(' '));
const NEG = /^(not|never|no|don't|dont|can't|cant|won't|wont|isn't|aren't|nothing|lost|bad|wrong|fail|failed|failing|problem|mistake|worst|boring|stop|without|instead|rather|anymore|cold)$/i;
const CHAPTER = /^(first|second|third|fourth|fifth|lastly|finally|step|number)$/i;
const NUMWORD = /^(one|two|three|four|five|six|seven|eight|nine|ten|hundred|thousand|million|billion|half|double|twice)$/i;
const ORD = { first: 1, one: 1, second: 2, two: 2, third: 3, three: 3, fourth: 4, four: 4, fifth: 5, five: 5, lastly: 0, finally: 0 };

/** words (cut clock, with p = trailing punctuation) → phrases. A phrase ends at . ? ! or a gap, and at a comma once long. */
export function phrases(words, { maxWords = 9, gap = 0.38 } = {}) {
  const out = []; let cur = [];
  const flush = () => { if (cur.length) out.push(cur); cur = []; };
  words.forEach((w, i) => {
    cur.push(w);
    const nx = words[i + 1], hard = /[.?!]/.test(w.p ?? ''), soft = /[,;:]/.test(w.p ?? '');
    if (!nx || hard || (nx.t - w.end > gap) || (soft && cur.length >= 4) || cur.length >= maxWords) flush();
  });
  // a one- or two-word scrap joins its neighbour (a card must stay readable, >= 1.2 s)
  for (let i = out.length - 1; i > 0; i--) if (out[i].length <= 2 && !/[.?!]/.test(out[i - 1].at(-1).p ?? '')) { out[i - 1].push(...out[i]); out.splice(i, 1); }
  return out.map((ws, i) => ({ i, t0: ws[0].t, t1: ws.at(-1).end, text: ws.map(w => w.word).join(' '), words: ws.map(w => ({ w: w.word, t: w.t, end: w.end })), end: ws.at(-1).p ?? '' }));
}

const clean = s => s.toLowerCase().replace(/[^a-z0-9%$']/g, '');

/** The role a phrase plays (CONTEXT.md section 5). */
export function roleOf(ph, idx, all) {
  const ws = ph.words.map(w => clean(w.w));
  if (idx === 0) return ph.end.includes('?') ? 'question' : 'hook';
  // a step: "first thing", "second step", "number two", "lastly", "tip three" (an ordinal followed by its noun, or a lead word)
  const at = ws.findIndex((w, k) => k < 4 && ((ORD[w] != null && /^(thing|step|tip|reason|rule|mistake|way|one)$/.test(ws[k + 1] ?? '')) || (w === 'number' && ORD[ws[k + 1]] != null) || ((w === 'lastly' || w === 'finally') && k === 0)));
  if (at >= 0) return 'chapter';
  if (ws.some(w => /\d/.test(w) || /%/.test(w)) || ws.some(w => NUMWORD.test(w) && w !== 'one')) return 'number';
  if (ph.end.includes('?')) return 'question';
  if (idx >= all.length - 2 && /^(thank|thanks|follow|comment|subscribe|so|and)$/.test(ws[0] ?? '')) return idx === all.length - 1 ? 'cta' : 'payoff';
  if (ws.filter(w => NEG.test(w)).length) return 'negative';
  return 'claim';
}

/** The one word the frame is about: a number first, else the strongest content word (long, rare, late in the phrase). */
export function heroOf(ph) {
  const cand = ph.words.map((w, k) => ({ k, c: clean(w.w), w: w.w })).filter(x => x.c && !STOP.has(x.c));
  const num = ph.words.findIndex(w => /\d/.test(w.w) || NUMWORD.test(clean(w.w)) && clean(w.w) !== 'one');
  if (num >= 0) return num;
  if (!cand.length) return ph.words.length - 1;
  const score = x => Math.min(x.c.length, 9) + x.k * 0.45 + (/^[A-Z]{2,}/.test(x.w) ? 2 : 0) - (NEG.test(x.c) ? 4 : 0) - (/ing$|ly$/.test(x.c) && x.c.length < 7 ? 1 : 0);
  return cand.sort((a, b) => score(b) - score(a))[0].k;
}

/** Chapter number for "first thing", "number two", "second thing", "lastly". */
export function chapterNo(ph) {
  for (const w of ph.words) { const n = ORD[clean(w.w)]; if (n != null) return n; }
  return null;
}

/** "a, b and c" → ['a','b','c'] when the phrase reads as a list of three or more short items. */
export function listItems(ph) {
  const parts = ph.text.split(/,\s*|\s+and\s+/i).map(s => s.trim()).filter(Boolean);
  return parts.length >= 3 && parts.every(p => p.split(' ').length <= 3) ? parts : null;
}

export function readClip(words) {
  const ps = phrases(words);
  return ps.map((ph, i) => {
    const role = roleOf(ph, i, ps), hero = heroOf(ph);
    return { ...ph, role, hero, heroWord: ph.words[hero]?.w ?? '', chapter: role === 'chapter' ? chapterNo(ph) : null, list: listItems(ph) };
  });
}
