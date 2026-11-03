// Steps 5-6: the director and the caster. One optional Muse Spark call per video; everything else is rules.
// The model only answers, per phrase: role, hero word index, template id (from the dialect's menu). It never writes
// positions, timings, colours or code (CONTEXT.md section 7).

const META = 'https://api.meta.ai/v1/chat/completions';

/** One compact call: numbered phrases + the template menu in, picks out. Returns null when there is no key or it fails. */
export async function askSpark(reads, dialect, { model = 'muse-spark-1.3', key = process.env.MODEL_API_KEY } = {}) {
  if (!key) return null;
  const menu = dialect.templates.map(t => `${t.id}: ${t.use} [roles: ${t.roles.join('/')}]`).join('\n');
  const lines = reads.map(r => `${r.i}|${r.role}|${r.text}`).join('\n');
  const system = `You are a short-form video editor. For each numbered phrase pick ONE template id from the menu, confirm or fix its role, and give the index (0-based, in the phrase) of the single word the frame is about. Rules: never the same template twice in a row; about 1 in 4 phrases is a plain rest beat (kb.rest); loud templates on the hook, numbers, warnings, steps and the payoff. Answer only JSON.\nRoles: hook question claim negative number chapter payoff cta.\nMenu:\n${menu}`;
  const schema = { type: 'object', properties: { picks: { type: 'array', items: { type: 'object', properties: { i: { type: 'integer' }, role: { type: 'string' }, hero: { type: 'integer' }, t: { type: 'string' } }, required: ['i', 'role', 'hero', 't'] } } }, required: ['picks'] };
  const t0 = performance.now();
  try {
    const r = await fetch(META, {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: lines }], response_format: { type: 'json_schema', json_schema: { name: 'picks', schema } }, temperature: 0.2 }),
    });
    if (!r.ok) { console.warn(`Muse Spark answered ${r.status}: ${(await r.text()).slice(0, 200)}`); return null; }
    const j = await r.json();
    const txt = j.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
    return { picks: parsed.picks ?? [], usage: j.usage ?? null, seconds: +((performance.now() - t0) / 1000).toFixed(2), model };
  } catch (e) { console.warn('Muse Spark call failed:', e.message); return null; }
}

/** The caster: one template per phrase under the dialect's rules. Deterministic: same reads, same picks. */
export function cast(reads, dialect, spark = null) {
  const byId = Object.fromEntries(dialect.templates.map(t => [t.id, t]));
  const want = new Map((spark?.picks ?? []).map(p => [p.i, p]));
  const out = []; let restCount = 0, lastLoud = false, sinceTransition = 99, lastTransition = null, mono = false;
  const n = reads.length;
  reads.forEach((r, k) => {
    const sp = want.get(r.i);
    if (sp) { if (sp.role) r.role = sp.role; if (Number.isInteger(sp.hero) && r.words[sp.hero]) { r.hero = sp.hero; r.heroWord = r.words[sp.hero].w; } }
    const prev = out.at(-1)?.t;
    const fits = t => t.roles.includes(r.role) && t.id !== prev && (!t.needs || (t.needs === 'list' && r.list));
    let t = sp && byId[sp.t] && byId[sp.t].id !== prev ? byId[sp.t] : null;
    if (!t) {
      // rules: steps get the chapter card; lists the list; numbers the stat; the hook a stacked close-up;
      // a quiet beat after a loud one; the second-to-last claim goes mono, so colour returns on the payoff
      const pref =
        r.role === 'chapter' ? ['kb.chapter'] :
        r.list ? ['kb.list'] :
        r.role === 'number' ? ['kb.void-stat', 'kb.hero-chest'] :
        k === 0 ? ['kb.stack-side'] :
        r.role === 'cta' ? ['kb.rest'] :
        k === n - 3 && !mono ? ['kb.mono'] :
        lastLoud ? (restCount / Math.max(1, k) < dialect.pace.restShare ? ['kb.rest', 'kb.hero-chest'] : ['kb.hero-chest', 'kb.rest']) :
        r.role === 'negative' ? ['kb.field-hot', 'kb.hero-chest'] :
        r.role === 'question' ? ['kb.stack-side', 'kb.hero-chest'] :
        out.at(-2)?.t === 'kb.stack-side' ? ['kb.hero-chest', 'kb.rest'] : ['kb.stack-side', 'kb.hero-chest', 'kb.rest'];
      t = pref.map(id => byId[id]).find(x => x && fits(x)) ?? dialect.templates.find(fits) ?? byId['kb.rest'];
    }
    if (t.id === 'kb.mono') mono = true;
    if (t.id === 'kb.rest') restCount++;
    // transitions: only into a loud beat, at most one every few beats, never the same twice in a row
    let transition = 'cut';
    if (t.loud && sinceTransition >= dialect.pace.transitionEvery) {
      transition = t.transition ?? dialect.transitions.find(x => x !== lastTransition && x !== (k ? out.at(-1).transition : ''));
      lastTransition = transition; sinceTransition = 0;
    } else sinceTransition++;
    if (prev === 'kb.mono') transition = 'flash';   // colour returns with a flash
    out.push({ i: r.i, t: t.id, transition, why: sp && byId[sp.t]?.id === t.id ? 'spark' : 'rules' });
    lastLoud = t.loud;
  });
  return out;
}
