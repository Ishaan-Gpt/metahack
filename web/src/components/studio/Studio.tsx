'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { HaloMark, Wordmark } from '@/components/ui/Logo';
import { IconArrow, IconClose, IconSend, IconUpload } from '@/components/ui/icons';

/**
 * The studio as an editor: footage bin on the left, the preview in the middle, Moovi's chat on the right where you ask
 * for changes in words, and a timeline at the bottom that shows the cut Muse Spark planned (beats by layout, caption
 * cards, effects, your voice). The job id lives in the URL (?job=) so a reload or a shared link reopens the same edit.
 */

type Style = { id: string; label: string; line: string; ref: string; swatch: string[] };
type Stage = { id: string; label: string; detail: string; state: 'pending' | 'running' | 'done' | 'error' | 'skipped'; seconds?: number };
type Ev = { t: number; kind: string; text: string };
type JobErr = { code: string; human: string; detail?: string };
type Status = {
  id: string; state: 'queued' | 'running' | 'done' | 'error'; pct: number; stage?: string; stages: Stage[]; events: Ev[];
  style?: string; styleLabel?: string; ahead?: number; error?: JobErr; seconds?: number; duration?: number; raw?: string;
  choice?: { by: string; style: string; why: string };
  plan?: { segments: number; layouts: string[]; planner?: string; captions: number; photos: number };
  meta?: { calls?: { call: string; model: string; cache: boolean; seconds: number | null; tokens: number | null; standin: boolean }[] };
  outputs?: { edit: string; beforeAfter: string | null; raw: string };
};
type Spec = { duration: number; segments: { type: string; t0: number; t1: number; label: string | null }[]; captions: { t0: number; t1: number; text: string; hero: string | null }[]; sfx: { t: number; k: string }[] };
type Health = { meta: 'live' | 'test' | 'claude' | 'missing'; ffmpeg: boolean; queue: number };
type Msg = { who: 'you' | 'moovi'; text: string; kind?: string };

const MIN_S = 5, MAX_S = 75, MAX_MB = 400;
const LAYOUT: Record<string, { name: string; c: string }> = {
  face: { name: 'You', c: '#7DB7EA' }, graphic: { name: 'Photo card', c: '#E3B65C' }, split: { name: 'Photo + you', c: '#9AD3B8' },
  list: { name: 'List', c: '#B9A6FF' }, post: { name: 'Post card', c: '#F29C8F' }, wide: { name: 'Words beside', c: '#F6C06E' },
  orbit: { name: 'Icon orbit', c: '#8FD0E8' }, topsquare: { name: 'You on top', c: '#A8C3E8' }, textbehind: { name: 'Word behind', c: '#5394DA' },
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  let r: Response;
  // every call is bounded: one request that never answers must not freeze the polling loop
  try { r = await fetch(url, { ...init, signal: init?.signal ?? AbortSignal.timeout(init?.method === 'POST' ? 60000 : 10000) }); } catch { throw { code: 'OFFLINE', human: 'We cannot reach the studio. Check your connection; we will keep trying.' } satisfies JobErr; }
  const j = await r.json().catch(() => null);
  if (!r.ok) throw (j?.error ?? { code: `HTTP_${r.status}`, human: 'The studio answered with an error. Try again in a moment.' });
  return j as T;
}

function takeHandoff(): Promise<{ file: File; style: string } | null> {
  return new Promise(ok => {
    if (typeof indexedDB === 'undefined') return ok(null);
    const req = indexedDB.open('moovi-handoff', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('take');
    req.onerror = () => ok(null);
    req.onsuccess = () => {
      try {
        const tx = req.result.transaction('take', 'readwrite'), st = tx.objectStore('take'), g = st.get('latest');
        g.onsuccess = () => { const v = g.result ?? null; if (v) st.delete('latest'); ok(v && v.file ? v : null); };
        g.onerror = () => ok(null);
      } catch { ok(null); }
    };
  });
}

function checkFile(f: File): Promise<{ ok: true; url: string } | { ok: false; err: JobErr }> {
  return new Promise(res => {
    if (!/^video\//.test(f.type) && !/\.(mp4|mov|m4v|webm|mkv|avi)$/i.test(f.name)) return res({ ok: false, err: { code: 'NOT_VIDEO', human: 'That file is not a video. Drop an MP4, MOV or WEBM.' } });
    if (f.size > MAX_MB * 1024 * 1024) return res({ ok: false, err: { code: 'TOO_BIG', human: `That file is over ${MAX_MB} MB. Export a smaller version (1080p is plenty).` } });
    const url = URL.createObjectURL(f), v = document.createElement('video');
    v.preload = 'metadata'; v.muted = true; v.src = url;
    const t = setTimeout(() => res({ ok: true, url }), 5000);
    v.onloadedmetadata = () => {
      clearTimeout(t); const s = v.duration;
      if (Number.isFinite(s) && s < MIN_S) return res({ ok: false, err: { code: 'TOO_SHORT', human: `That take is ${s.toFixed(1)} s. Give me at least ${MIN_S} seconds of talking.` } });
      if (Number.isFinite(s) && s > MAX_S + 0.5) return res({ ok: false, err: { code: 'TOO_LONG', human: `That take is ${Math.round(s)} s. I edit up to ${MAX_S} s for now: trim it to your best ${MAX_S} seconds.` } });
      res({ ok: true, url });
    };
    v.onerror = () => { clearTimeout(t); res({ ok: true, url }); };
  });
}

function upload(f: File, style: string, onPct: (p: number) => void): Promise<{ id: string }> {
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/jobs');
    x.setRequestHeader('x-file-name', encodeURIComponent(f.name || 'take.mp4'));
    x.setRequestHeader('x-style', style);
    x.upload.onprogress = e => e.lengthComputable && onPct(e.loaded / e.total);
    x.onload = () => {
      let j: { id?: string; error?: JobErr } | null = null; try { j = JSON.parse(x.responseText); } catch { /* not json */ }
      if (x.status >= 200 && x.status < 300 && j?.id) ok({ id: j.id }); else no(j?.error ?? { code: `HTTP_${x.status}`, human: 'The upload did not go through. Try again.' });
    };
    x.onerror = () => no({ code: 'OFFLINE', human: 'The upload was cut off. Check your connection and try again.' });
    x.send(f);
  });
}

/** read a prompt into one of the edits the engine can make today; anything else gets an honest answer */
function intent(text: string, styles: Style[]): { style?: string; music?: boolean; handle?: string; reply: string } | null {
  const t = text.toLowerCase();
  const st = styles.find(s => t.includes(s.label.toLowerCase()) || t.includes(s.id.replace('-', ' ')));
  const handle = text.match(/@[\w.]{2,30}/)?.[0];
  const music = /\b(no|without|remove|kill|drop|mute)\b.{0,12}\bmusic\b|\bmusic off\b/.test(t) ? false : /\b(add|with|bring back|put)\b.{0,12}\bmusic\b|\bmusic on\b/.test(t) ? true : undefined;
  const auto = /\b(you pick|auto|surprise|whatever fits|choose for me)\b/.test(t);
  if (!st && !auto && music === undefined && !handle) return null;
  const parts = [st ? `switching to ${st.label}` : auto ? 'letting Muse Spark pick the style again' : null, music === false ? 'taking the music out' : music ? 'putting the music back' : null, handle ? `putting ${handle} on it` : null].filter(Boolean);
  return { style: st?.id ?? (auto ? 'auto' : undefined), music, handle, reply: `On it: ${parts.join(', ')}. Same take, so the words are already heard.` };
}

export function Studio() {
  const params = useSearchParams(), router = useRouter();
  const [styles, setStyles] = useState<Style[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [style, setStyle] = useState<string>(params.get('style') && params.get('style') !== 'pick' ? params.get('style')! : 'auto');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [upPct, setUpPct] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(params.get('job'));
  const [st, setSt] = useState<Status | null>(null);
  const [spec, setSpec] = useState<Spec | null>(null);
  const [conn, setConn] = useState<'ok' | 'retrying'>('ok');
  const [drag, setDrag] = useState(false);
  const [view, setView] = useState<'edit' | 'split'>('edit');
  const [msgs, setMsgs] = useState<Msg[]>([{ who: 'moovi', text: 'Drop a raw take on the left. Pick a style, or leave it on Auto and Muse Spark picks one for what you say.' }]);
  const [draft, setDraft] = useState('');
  const [t, setT] = useState(0);
  const vid = useRef<HTMLVideoElement>(null);
  const seen = useRef(0);
  const say = useCallback((m: Msg) => setMsgs(x => [...x, m]), []);

  useEffect(() => {
    api<{ styles: Style[] }>('/api/styles').then(r => setStyles(r.styles)).catch(() => setStyles([]));
    api<Health>('/api/health').then(setHealth).catch(() => setHealth(null));
  }, []);
  useEffect(() => {
    if (jobId) return;
    takeHandoff().then(h => { if (h) { setStyle(h.style === 'pick' ? 'auto' : h.style || 'auto'); void pick(h.file); } });
    if (params.get('sample') === '1') void startSample();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = useCallback((id: string | null) => {
    setJobId(id); setSt(null); setSpec(null); seen.current = 0;
    router.replace(`/studio${id ? `?job=${id}` : ''}`, { scroll: false });
  }, [router]);

  // poll the job; turn its new events into Moovi's chat lines
  useEffect(() => {
    if (!jobId) return;
    let stop = false, wait = 900, timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      try {
        const s = await api<Status>(`/api/jobs/${jobId}`);
        if (stop) return;
        setSt(s); setConn('ok'); wait = 900;
        const fresh = s.events.slice(seen.current); seen.current = s.events.length;
        for (const e of fresh) if (e.kind !== 'info' || /chose|heard|beats|Done/i.test(e.text)) say({ who: 'moovi', text: e.text, kind: e.kind });
        if (s.plan && !spec) api<Spec>(`/api/jobs/${jobId}/spec`).then(setSpec).catch(() => {});
        if (s.state === 'done') { api<Spec>(`/api/jobs/${jobId}/spec`).then(setSpec).catch(() => {}); return; }
        if (s.state === 'error') { say({ who: 'moovi', text: s.error?.human ?? 'That edit stopped.', kind: 'error' }); return; }
      } catch (e) {
        const err = e as JobErr;
        if (err.code === 'NOT_FOUND' || err.code === 'BAD_ID') { setSt({ id: jobId, state: 'error', pct: 0, stages: [], events: [], error: err }); return; }
        setConn('retrying'); wait = Math.min(8000, wait * 1.6);
      }
      if (!stop) timer = setTimeout(tick, wait);
    };
    void tick();
    return () => { stop = true; clearTimeout(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  async function pick(f: File) {
    const r = await checkFile(f);
    if (!r.ok) { say({ who: 'moovi', text: r.err.human, kind: 'error' }); return; }
    setFile(f); setPreview(r.url); go(null);
    say({ who: 'moovi', text: `Got ${f.name}. Press Edit, or tell me how it should look.` });
  }
  async function start() {
    if (!file) { say({ who: 'moovi', text: 'Drop a take first, or try the sample.', kind: 'error' }); return; }
    setUpPct(0);
    try { const { id } = await upload(file, style, setUpPct); setUpPct(null); go(id); say({ who: 'moovi', text: style === 'auto' ? 'Watching your take. Muse Spark will pick the style.' : `Editing in ${styles.find(s => s.id === style)?.label}.` }); }
    catch (e) { setUpPct(null); say({ who: 'moovi', text: (e as JobErr).human, kind: 'error' }); }
  }
  async function startSample() {
    try { const { id } = await api<{ id: string }>(`/api/sample?style=${encodeURIComponent(style)}`, { method: 'POST' }); go(id); say({ who: 'moovi', text: 'Editing the sample take (Iliana, Wikitongues, CC BY-SA).' }); }
    catch (e) { say({ who: 'moovi', text: (e as JobErr).human, kind: 'error' }); }
  }
  async function reedit(o: { style?: string; music?: boolean; handle?: string }) {
    if (!jobId) return;
    const q = new URLSearchParams(); if (o.style) q.set('style', o.style); if (o.music !== undefined) q.set('music', o.music ? '1' : '0'); if (o.handle) q.set('handle', o.handle);
    try { await api(`/api/jobs/${jobId}/retry?${q}`, { method: 'POST' }); const id = jobId; setJobId(null); setSt(null); setSpec(null); seen.current = 0; setTimeout(() => setJobId(id), 0); }
    catch (e) { say({ who: 'moovi', text: (e as JobErr).human, kind: 'error' }); }
  }
  function send() {
    const text = draft.trim(); if (!text) return;
    setDraft(''); say({ who: 'you', text });
    if (!jobId) {
      const i = intent(text, styles);
      if (i?.style) { setStyle(i.style); say({ who: 'moovi', text: `Set to ${i.style === 'auto' ? 'Auto' : styles.find(s => s.id === i.style)?.label}. ${file ? 'Press Edit when ready.' : 'Now drop your take.'}` }); }
      else say({ who: 'moovi', text: file ? 'Press Edit and I will start. You can ask for another style or no music after.' : 'Drop a take on the left first.' });
      return;
    }
    if (st && (st.state === 'running' || st.state === 'queued')) { say({ who: 'moovi', text: 'Still cutting this one. Ask again when it is done and I will redo it.' }); return; }
    const i = intent(text, styles);
    if (!i) { say({ who: 'moovi', text: `Today I can change the style (${styles.map(s => s.label).join(', ')}, or Auto), take the music out or put it back, and put your @handle on it. Try "make it Clean UI, no music".` }); return; }
    say({ who: 'moovi', text: i.reply }); void reedit(i);
  }

  const phase = !jobId ? 'pick' : !st ? 'loading' : st.state;
  const file$ = (n: string, dl = false) => `/api/jobs/${jobId}/file/${n}${dl ? '?dl=1' : ''}`;
  const src = phase === 'done' ? (view === 'edit' ? file$('edit.mp4') : file$('before-after.mp4')) : jobId ? file$(st?.raw ?? 'input.mp4') : preview;
  const D = spec?.duration ?? st?.duration ?? 0;
  const label = useMemo(() => styles.find(s => s.id === (st?.style ?? style))?.label ?? (style === 'auto' ? 'Auto' : style), [styles, st?.style, style]);

  return (
    <div className="ed">
      <header className="ed__top">
        <a href="/" className="ed__brand" aria-label="Moovi home"><Wordmark /></a>
        <span className="ed__proj">{file?.name ?? (jobId ? `Edit ${jobId}` : 'Untitled edit')}<i>{label}</i></span>
        <span className="ed__sp" />
        {conn === 'retrying' && <span className="ed__conn">Reconnecting…</span>}
        {health && <span className={`ed__meta ed__meta--${health.meta}`}><i />{health.meta === 'live' ? 'Muse Spark live' : health.meta === 'claude' ? 'Claude Sonnet directing' : health.meta === 'test' ? 'Test mode' : 'Meta key missing'}</span>}
        <a className={`ed__export ${phase === 'done' ? '' : 'is-off'}`} href={phase === 'done' ? file$('edit.mp4', true) : undefined} aria-disabled={phase !== 'done'}>Export</a>
      </header>

      <aside className="ed__bin">
        <span className="ed__lab">Footage</span>
        <label className={`ed__drop ${drag ? 'is-drag' : ''}`}
          onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) void pick(f); }}>
          <input type="file" accept="video/*,.mp4,.mov,.m4v,.webm" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void pick(f); e.target.value = ''; }} />
          {file ? <span className="ed__clip"><video src={preview ?? undefined} muted /><span>{file.name}<i>{st?.state === 'done' ? 'edited' : jobId ? 'analysing' : 'ready'}</i></span></span>
            : <span className="ed__drop-in"><IconUpload width={22} height={22} />Drop raw footage<em>{MIN_S}–{MAX_S} s, talking to camera</em></span>}
        </label>
        {!file && !jobId && <button className="ed__textbtn" onClick={startSample}>Use the sample take</button>}

        <span className="ed__lab">Style</span>
        <div className="ed__styles" role="radiogroup" aria-label="Style">
          <button role="radio" aria-checked={style === 'auto'} className={style === 'auto' ? 'is-on' : ''} onClick={() => setStyle('auto')}><HaloMark size={16} /><b>Auto</b><em>Muse Spark picks</em></button>
          {styles.map(s => (
            <button key={s.id} role="radio" aria-checked={style === s.id} className={style === s.id ? 'is-on' : ''} onClick={() => setStyle(s.id)} title={s.line}>
              <span className="ed__sw">{s.swatch.map(c => <i key={c} style={{ background: c }} />)}</span><b>{s.label}</b>
            </button>
          ))}
        </div>
        {phase === 'done'
          ? <button className="ed__go" onClick={() => reedit({ style })} disabled={style === st?.style}>Re-edit in {styles.find(s => s.id === style)?.label ?? 'Auto'}</button>
          : <button className="ed__go" onClick={start} disabled={!file || upPct !== null || phase === 'running' || phase === 'queued'}>
              {upPct !== null ? `Uploading ${Math.round(upPct * 100)}%` : phase === 'running' || phase === 'queued' ? 'Editing…' : <>Edit <IconArrow width={18} height={18} /></>}
            </button>}
      </aside>

      <section className="ed__stage">
        <div className="ed__tabs">
          <span className="ed__lab">Preview</span>
          {phase === 'done' && st?.outputs?.beforeAfter && <span className="ed__seg"><button aria-pressed={view === 'edit'} onClick={() => setView('edit')}>Edit</button><button aria-pressed={view === 'split'} onClick={() => setView('split')}>Before / after</button></span>}
        </div>
        <div className={`ed__screen ${view === 'split' && phase === 'done' ? 'is-wide' : ''}`}>
          {src ? <video key={src} ref={vid} src={src} controls={phase === 'done'} autoPlay={phase === 'done'} muted={phase !== 'done'} loop={phase !== 'done'} playsInline onTimeUpdate={e => setT(e.currentTarget.currentTime)} />
            : <div className="ed__empty"><HaloMark size={54} /><p>Your edit plays here.</p></div>}
          {(phase === 'running' || phase === 'queued' || phase === 'loading') && st && (
            <div className="ed__busy">
              <HaloMark size={30} spin />
              <b>{st.state === 'queued' ? (st.ahead ? `${st.ahead} ahead of you` : 'Starting') : st.stages.find(x => x.id === st.stage)?.label ?? 'Working'}</b>
              <span>{st.stages.find(x => x.id === st.stage)?.detail}</span>
              <span className="ed__pct"><i style={{ transform: `scaleX(${Math.max(.02, st.pct / 100)})` }} /></span>
            </div>
          )}
          {phase === 'error' && st?.error && (
            <div className="ed__busy ed__busy--err" role="alert">
              <b>That edit stopped.</b><span>{st.error.human}</span>
              <span className="ed__row">
                {!['NOT_VIDEO', 'NO_PICTURE', 'NO_SOUND', 'TOO_SHORT', 'TOO_LONG', 'NO_SPEECH', 'NOT_FOUND', 'BAD_ID'].includes(st.error.code) && <button className="ed__go" onClick={() => reedit({})}>Try again</button>}
                <button className="ed__textbtn" onClick={() => { setFile(null); setPreview(null); go(null); }}>Use another take</button>
              </span>
              <code>{st.error.code} · {st.id}</code>
            </div>
          )}
        </div>
      </section>

      <aside className="ed__chat">
        <div className="ed__chat-h"><HaloMark size={20} spin={phase === 'running'} /><b>Moovi</b><span>directed by Muse Spark</span></div>
        <ol className="ed__msgs" ref={el => { el?.scrollTo({ top: el.scrollHeight }); }}>
          {msgs.map((m, i) => <li key={i} className={`is-${m.who} ${m.kind ? `is-${m.kind}` : ''}`}>{m.text}</li>)}
          {phase === 'done' && st && <li className="is-moovi is-card">
            <b>{st.styleLabel}</b>{st.choice ? ` · ${st.choice.by}: ${st.choice.why}` : ''}
            {st.plan && <span>{st.plan.segments} beats · {st.plan.captions} captions · {st.plan.photos} photos · made in {Math.round(st.seconds ?? 0)} s</span>}
            {st.meta?.calls?.map(c => <code key={c.call}>{c.model} · {c.call}{c.cache ? ' · cached' : c.seconds ? ` · ${c.seconds}s` : ''}{c.standin ? ' · test' : ''}</code>)}
          </li>}
        </ol>
        <form className="ed__ask" onSubmit={e => { e.preventDefault(); send(); }}>
          <textarea value={draft} rows={2} placeholder={phase === 'done' ? 'Make it Clean UI, no music…' : 'Ask anything…'} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
          <button aria-label="Send" disabled={!draft.trim()}><IconSend width={18} height={18} /></button>
        </form>
      </aside>

      <section className="ed__tl" aria-label="Timeline">
        <div className="ed__tl-h"><span className="ed__lab">Timeline</span><span className="ed__time">{fmt(t)} / {fmt(D)}</span>{spec && <span className="ed__legend">{[...new Set(spec.segments.map(s => s.type))].map(k => <i key={k} style={{ ['--c' as string]: LAYOUT[k]?.c }}>{LAYOUT[k]?.name ?? k}</i>)}</span>}</div>
        <div className="ed__tracks" onClick={e => { if (!D || !vid.current || phase !== 'done') return; const r = (e.currentTarget.querySelector('.ed__lanes') as HTMLElement).getBoundingClientRect(); const k = (e.clientX - r.left) / r.width; if (k >= 0 && k <= 1) vid.current.currentTime = k * D; }}>
          <div className="ed__names"><span>Ruler</span><span>V1 · Beats</span><span>T1 · Captions</span><span>FX</span><span>A1 · Voice</span></div>
          <div className="ed__lanes">
            <div className="ed__ruler">{D ? Array.from({ length: Math.floor(D / 2) + 1 }, (_, i) => <i key={i} style={{ left: `${(i * 2 / D) * 100}%` }}>{i * 2}s</i>) : null}</div>
            <div className="ed__lane">{spec ? spec.segments.map((s, i) => <b key={i} title={`${LAYOUT[s.type]?.name ?? s.type}${s.label ? `: ${s.label}` : ''}`} style={{ left: `${s.t0 / D * 100}%`, width: `${(s.t1 - s.t0) / D * 100}%`, ['--c' as string]: LAYOUT[s.type]?.c }}>{LAYOUT[s.type]?.name ?? s.type}</b>) : <em className="ed__ph">{jobId ? 'Muse Spark is planning the beats…' : 'Beats appear when Muse Spark plans your edit'}</em>}</div>
            <div className="ed__lane ed__lane--cap">{spec?.captions.map((c, i) => <b key={i} title={c.text} style={{ left: `${c.t0 / D * 100}%`, width: `${(c.t1 - c.t0) / D * 100}%` }}>{c.hero ? <u>{c.hero}</u> : c.text}</b>)}</div>
            <div className="ed__lane ed__lane--fx">{spec?.sfx.map((x, i) => <i key={i} title={x.k} style={{ left: `${x.t / D * 100}%` }} />)}</div>
            <div className="ed__lane ed__lane--a">{D ? <span className="ed__wave" /> : null}</div>
            {D > 0 && <span className="ed__head" style={{ left: `${Math.min(1, t / D) * 100}%` }} />}
          </div>
        </div>
      </section>
    </div>
  );
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
void IconClose;
