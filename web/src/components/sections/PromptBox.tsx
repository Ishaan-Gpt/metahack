'use client';
import { useEffect, useId, useRef, useState, type DragEvent, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';
import { IconUpload, IconSpark, IconSend, IconClose, IconScissors, IconOrb, IconRatio, IconCheck } from '@/components/brand/icons';
import { brief } from '@/lib/content';
import { getWorld, ui } from '@/lib/world';
import { saveTake } from '@/lib/handoff';
import { goStudio } from '@/components/motion/StudioHop';

type Preset = (typeof brief.presets)[number]['id'];
type Missing = 'preset' | 'edit';

const ICONS: Record<Preset, (p: { width: number; height: number }) => ReactNode> = { auto: IconOrb, style: IconScissors, split: IconRatio };

/**
 * The brief box Moovi holds up in the hero. Drop a raw take (or pick it), choose how it should look (Muse Spark
 * picks, one of the five styles, or a before/after), add a note if you like, and send: the take is kept in IndexedDB
 * on this origin (lib/handoff) and the studio opens with it. "Try a sample take" opens the studio on a sample.
 * Its surface registers with the stage (`ui.grip`): Moovi's hands grip its two ends and paint over them.
 */
export function PromptBox() {
  const shell = useRef<HTMLDivElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const pick = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [video, setVideo] = useState<File | null>(null);
  const [preset, setPreset] = useState<Preset | null>(null);
  const [drag, setDrag] = useState(false);
  const [nudge, setNudge] = useState(0);
  const [miss, setMiss] = useState<Missing | null>(null);
  const [sending, setSending] = useState(false);
  const listId = useId();

  useEffect(() => {
    ui.grip = shell.current;
    return () => { if (ui.grip === shell.current) ui.grip = null; };
  }, []);

  // the textarea grows with the note, up to a few lines
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 168)}px`;
  }, [text]);

  const choose = (p: Preset) => {
    setPreset(p);
    setMiss(null);
    requestAnimationFrame(() => area.current?.focus());
  };

  const addFiles = (list: FileList | null) => {
    const v = list && Array.from(list).find(f => f.type.startsWith('video/'));
    if (!v) return;
    setVideo(v);
    // a take dropped before a look is picked: Muse Spark picks (it can still be changed)
    if (!preset) setPreset('auto');
    setMiss(null);
    getWorld()?.act('think', 900);
  };

  function flag(m: Missing) {
    setMiss(m);
    setNudge(n => n + 1);
    getWorld()?.act('squint', 900);
    if (m === 'edit') pick.current?.click();
  }

  const ready = !!preset && !!video;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    if (sending) return;
    if (!preset) { flag('preset'); return; }
    if (!video) { flag('edit'); return; }
    setSending(true);
    getWorld()?.act('celebrate', 1200);
    const style = preset === 'style' ? 'pick' : 'auto';
    const note = text.trim() || undefined;
    // the studio reads the take from IndexedDB; if storage fails it still opens and asks for the take again
    const keep = saveTake(video, { style, note, split: preset === 'split' }).catch(() => undefined);
    void Promise.all([keep, new Promise(r => window.setTimeout(r, 700))]).finally(() => goStudio(`/studio?style=${style}`));
  };

  const sample = () => {
    getWorld()?.act('celebrate', 900);
    goStudio('/studio?sample=1');
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit();
  };

  const onDrag = (e: DragEvent, over: boolean) => {
    if (!Array.from(e.dataTransfer.types).includes('Files')) return;
    e.preventDefault();
    setDrag(over);
  };

  const current = preset ? brief.presets.find(p => p.id === preset)! : null;

  return (
    <form className="brief" aria-label={brief.label} onSubmit={submit} data-drag={drag || undefined} data-preset={preset ?? undefined}
      onDragOver={e => onDrag(e, true)} onDragEnter={e => onDrag(e, true)} onDragLeave={() => setDrag(false)}
      onDrop={e => { onDrag(e, false); addFiles(e.dataTransfer.files); }}>
      <div className="brief__shadow" aria-hidden="true" />
      <div className="brief__shell" ref={shell} aria-hidden="true" />
      <div key={nudge} className={`brief__body ${nudge ? 'is-nudged' : ''}`}>
        <button type="button" className="brief__drop" onClick={() => pick.current?.click()} aria-label={video ? brief.upload : brief.uploadVideo}
          title={brief.uploadVideo} data-want={preset && !video ? '' : undefined}>
          <IconUpload width={22} height={22} />
        </button>
        <input ref={pick} type="file" accept="video/*" hidden onChange={e => { addFiles(e.target.files); e.target.value = ''; }} />

        <div className="brief__presets" role="radiogroup" aria-label={brief.pickLabel} data-miss={miss === 'preset' || undefined}>
          {brief.presets.map(p => {
            const I = ICONS[p.id];
            return (
              <button key={p.id} type="button" role="radio" aria-checked={preset === p.id} className="brief__preset" onClick={() => choose(p.id)}>
                <I width={18} height={18} />
                <span className="brief__preset-t">{p.title}</span>
                <span className="brief__preset-l">{p.line}</span>
              </button>
            );
          })}
        </div>

        <label className="sr-only" htmlFor={`${listId}-text`}>{brief.label}</label>
        <textarea id={`${listId}-text`} ref={area} className="brief__text" rows={1} value={text} placeholder={current?.placeholder ?? brief.placeholder}
          onChange={e => setText(e.target.value)} onKeyDown={onKey} />

        {video && (
          <ul className="brief__files">
            <li className="brief__file">
              <span>{video.name}</span>
              <button type="button" aria-label={`Remove ${video.name}`} onClick={() => setVideo(null)}><IconClose width={14} height={14} /></button>
            </li>
          </ul>
        )}

        <div className="brief__bar">
          <button type="button" className="brief__tool brief__sample" onClick={sample} title={brief.suggest}>
            <IconSpark width={18} height={18} />
            <span>{brief.suggest}</span>
          </button>
          <p className="brief__need" role="status" data-ok={ready || undefined} data-miss={miss || undefined}>
            {miss ? brief.missing[miss] : ready ? <><IconCheck width={15} height={15} />{brief.send}</> : current ? current.need : null}
          </p>
          <button type="submit" className="brief__send" aria-label={brief.send} title={brief.send} data-ready={ready || undefined} disabled={sending}>
            <IconSend width={20} height={20} />
          </button>
        </div>
      </div>
    </form>
  );
}
