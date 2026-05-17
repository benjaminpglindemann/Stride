'use client';

import { useState, useRef, useEffect } from 'react';
import type { Athlete, Week, ParsedWorkout, ChatMessage } from '@/types';
import { sampleParsed } from '@/lib/mock-data';
import { renderMd } from '@/lib/utils';
import { apiFetch } from '@/lib/api-fetch';
import { parseGarminCSV } from '@/lib/garmin-parse';

interface Props {
  athlete: Athlete;
  weeks: Week[];
  onClose: () => void;
  onSave: (parsed: ParsedWorkout, thread: ChatMessage[]) => void;
}

type Step = 'drop' | 'parsed' | 'chat';

const STEP_LABELS: { id: Step; label: string }[] = [
  { id: 'drop',   label: 'Upload'  },
  { id: 'parsed', label: 'Confirm' },
  { id: 'chat',   label: 'Analyze' },
];

export default function UploadDrawer({ athlete, weeks, onClose, onSave }: Props) {
  const [step, setStep] = useState<Step>('drop');
  const [parsed, setParsed] = useState<ParsedWorkout | null>(null);
  const [note, setNote] = useState('');
  const [thread, setThread] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const stepIdx = STEP_LABELS.findIndex(s => s.id === step);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const parseFile = async (file: File): Promise<void> => {
    const text    = await file.text();
    const stripped = text.replace(/^﻿/u, '');
    const result  = parseGarminCSV(stripped, file.name);
    setParsed(result ?? sampleParsed);
    setStep('parsed');
  };

  const startParse = async (file?: File) => {
    setStep('drop');
    await new Promise(r => setTimeout(r, 500));
    if (file) {
      await parseFile(file);
    } else {
      setParsed(sampleParsed);
      setStep('parsed');
    }
  };

  const startChat = async () => {
    if (!parsed) return;
    const initial: ChatMessage[] = [];
    if (note.trim()) initial.push({ role: 'user', text: note.trim() });

    // Stream initial analysis from API
    setThread(initial);
    setStep('chat');
    setThinking(true);
    let aiText = '';
    setThread(t => [...t, { role: 'ai', text: '' }]);
    try {
      const res = await apiFetch('/api/coach/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setThread(t => [...t.slice(0, -1), { role: 'ai', text: aiText }]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown error';
      setThread(t => [...t.slice(0, -1), { role: 'ai', text: `Coach API error (${msg}). Check Vercel logs for details.` }]);
    } finally {
      setThinking(false);
    }
  };

  const initialAnalysisText = thread.find(m => m.role === 'ai')?.text ?? '';

  const sendFollowup = async (text: string) => {
    if (!parsed) return;
    const userMsg: ChatMessage = { role: 'user', text };
    const nextThread = [...thread, userMsg];
    setThread(nextThread);
    setThinking(true);
    let aiText = '';
    setThread(t => [...t, { role: 'ai', text: '' }]);
    try {
      const res = await apiFetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parsed,
          thread: nextThread.slice(0, -1),
          message: text,
          initialAnalysis: initialAnalysisText,
        }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setThread(t => [...t.slice(0, -1), { role: 'ai', text: aiText }]);
      }
    } catch {
      setThread(t => [...t.slice(0, -1), { role: 'ai', text: 'Connection dropped. Try again.' }]);
    } finally {
      setThinking(false);
    }
  };

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[100] animate-fade-in"
        style={{ background: 'rgba(22,20,16,0.32)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className="fixed right-0 top-0 bottom-0 w-[640px] max-w-[92vw] z-[101] flex flex-col bg-paper animate-slide-in-right"
        style={{ boxShadow: '-16px 0 40px rgba(22,20,16,0.18)' }}
        role="dialog"
        aria-label="Upload workout"
        onClick={e => e.stopPropagation()}
      >
        {/* Head */}
        <div className="px-7 py-[18px] border-b border-rule flex justify-between items-center bg-paper shrink-0">
          <div className="flex items-center gap-3.5 font-mono text-[11px] tracking-[0.04em] uppercase">
            {STEP_LABELS.map((s, i) => (
              <span key={s.id} className="flex items-center gap-3.5">
                <span className={
                  i < stepIdx ? 'text-ink-2 line-through' :
                  i === stepIdx ? 'text-accent' :
                  'text-ink-4'
                }>
                  {String(i + 1).padStart(2, '0')} {s.label}
                </span>
                {i < STEP_LABELS.length - 1 && (
                  <span className="text-rule">·</span>
                )}
              </span>
            ))}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] text-ink-3 hover:text-ink hover:bg-paper-2 bg-transparent border-0 cursor-pointer transition-colors duration-150"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Step bodies */}
        {step === 'drop' && (
          <DropStep
            dragOver={dragOver}
            setDragOver={setDragOver}
            fileInputRef={fileInputRef}
            onFile={(file) => startParse(file)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer?.files?.[0]; if (f) startParse(f); }}
            onSampleClick={() => startParse()}
          />
        )}

        {step === 'parsed' && parsed && (
          <ParsedStep
            parsed={parsed}
            note={note}
            setNote={setNote}
            onBack={() => setStep('drop')}
            onConfirm={startChat}
          />
        )}

        {step === 'chat' && parsed && (
          <ChatStep
            parsed={parsed}
            thread={thread}
            thinking={thinking}
            onSend={sendFollowup}
            onBack={() => setStep('parsed')}
            onSave={async () => {
              try {
                const res = await apiFetch('/api/workouts', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ parsed, thread, note }),
                });
                if (res.ok) {
                  onSave(parsed, thread); // only fires on success — triggers router.refresh()
                } else {
                  const body = await res.text().catch(() => '');
                  console.error('Save failed:', res.status, body);
                  // Still close the drawer so the user isn't stuck
                  onSave(parsed, thread);
                }
              } catch (err) {
                console.error('Save error:', err);
                onSave(parsed, thread);
              }
            }}
          />
        )}
      </aside>
    </>
  );
}

/* ─── Step 1: Drop ─── */
function DropStep({
  dragOver, setDragOver, fileInputRef, onFile, onDrop, onSampleClick,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onSampleClick: () => void;
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto px-7 pt-7 pb-6 flex flex-col">
        <div
          className={[
            'flex-1 min-h-[280px] border-[1.5px] border-dashed rounded-lg flex flex-col items-center justify-center gap-4 px-5 py-[60px] text-center transition-all duration-150',
            dragOver
              ? 'border-accent bg-accent-soft'
              : 'border-rule bg-paper-2',
          ].join(' ')}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <div className="w-14 h-14 rounded-full border border-ink flex items-center justify-center text-[22px] text-ink">
            ↓
          </div>
          <h3 className="font-serif text-[24px] italic text-ink">Drop your activity file</h3>
          <p className="font-sans text-[13.5px] text-ink-3 max-w-[360px] text-pretty leading-[1.5]">
            Garmin CSV export, FIT, or TCX. Parsed locally — we&apos;ll show you exactly what was detected before anything saves.
          </p>
          <div className="font-mono text-[11.5px] text-ink-3 mt-1">
            or{' '}
            <u className="text-ink cursor-pointer hover:text-accent" onClick={() => fileInputRef.current?.click()}>
              browse files
            </u>
            {' '}·{' '}
            <u className="text-ink cursor-pointer hover:text-accent" onClick={onSampleClick}>
              use today&apos;s sample
            </u>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.fit,.tcx"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }}
          />
        </div>
      </div>

      <div className="px-7 py-3.5 border-t border-rule flex justify-between items-center shrink-0">
        <span className="font-mono text-[11.5px] text-ink-4 tracking-[0.04em]">
          Files stay on this device. AI calls send only parsed metrics.
        </span>
        <button
          onClick={onSampleClick}
          className="bg-transparent text-ink-2 border border-rule px-4 py-[9px] rounded-full font-sans text-[13px] cursor-pointer hover:text-ink hover:border-ink transition-all duration-150"
        >
          Use sample →
        </button>
      </div>
    </>
  );
}

/* ─── Step 2: Confirm ─── */
function ParsedStep({
  parsed, note, setNote, onBack, onConfirm,
}: {
  parsed: ParsedWorkout;
  note: string;
  setNote: (v: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const SUMMARY = [
    { label: 'Distance',   value: parsed.distance.toFixed(2), unit: 'km'  },
    { label: 'Duration',   value: parsed.duration,            unit: ''    },
    { label: 'Avg pace',   value: parsed.avgPace,             unit: '/km' },
    { label: 'Avg HR',     value: String(parsed.avgHr),       unit: 'bpm' },
    { label: 'Max HR',     value: String(parsed.maxHr),       unit: 'bpm' },
    { label: 'Cadence',    value: String(parsed.avgCadence),  unit: 'spm' },
    { label: 'Vert. osc.', value: String(parsed.verticalOscillation), unit: 'cm' },
    { label: 'Elev. gain', value: String(parsed.elevation),   unit: 'm'   },
  ];

  return (
    <>
      <div className="flex-1 overflow-y-auto px-7 pt-7 pb-6 flex flex-col gap-[18px]">

        {/* Head */}
        <div className="flex justify-between items-baseline border-b border-rule pb-3.5">
          <div>
            <div className="font-sans text-[11px] tracking-[0.14em] uppercase text-ink-4 mb-1.5">
              Detected · {parsed.type}
            </div>
            <h3 className="font-serif text-[26px] italic text-ink">{parsed.date}</h3>
          </div>
          <span className="font-mono text-[11.5px] text-ink-3">{parsed.filename}</span>
        </div>

        {/* Summary grid */}
        <div className="grid grid-cols-4 gap-px bg-rule border border-rule rounded-sm overflow-hidden">
          {SUMMARY.map(({ label, value, unit }) => (
            <div key={label} className="bg-paper px-3.5 py-3.5 flex flex-col gap-1">
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-4)' }}>
                {label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 19, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', color: 'var(--ink)' }}>
                {value}
                {unit && <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 3 }}>{unit}</span>}
              </span>
            </div>
          ))}
        </div>

        {/* Splits */}
        <div className="flex flex-col">
          <div className="flex justify-between items-baseline mb-2">
            <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">Splits · per kilometre</span>
            <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">{parsed.splits.length} laps</span>
          </div>
          {parsed.splits.map((s, i) => (
            <div key={i} className="grid [grid-template-columns:30px_1fr_60px_50px_60px] gap-3.5 font-mono text-[12px] py-[7px] border-t border-rule-soft items-center">
              <span className="text-ink-4">km {s.km}</span>
              <span>
                <div className="h-[6px] bg-paper-2 rounded-full overflow-hidden">
                  <div className="h-full bg-ink rounded-full" style={{ width: `${s.paceFrac * 100}%` }} />
                </div>
              </span>
              <span className="text-ink tabular-nums">{s.pace}</span>
              <span className="text-ink-3 tabular-nums">{s.hr}</span>
              <span className="text-ink-3 tabular-nums">{s.cadence}</span>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="flex flex-col gap-2">
          <label className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">
            Add a note (optional)
          </label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Felt heavy through km 7. Tried negative splits but couldn't sustain."
            className="w-full font-sans text-[14px] italic border border-rule rounded-sm px-3.5 py-3 bg-paper text-ink resize-y min-h-[76px] outline-none focus:border-ink transition-colors duration-150 placeholder:text-ink-4 placeholder:italic"
          />
        </div>
      </div>

      <div className="px-7 py-3.5 border-t border-rule flex justify-between items-center shrink-0">
        <button onClick={onBack} className="bg-transparent text-ink-2 border border-rule px-4 py-[9px] rounded-full font-sans text-[13px] cursor-pointer hover:text-ink hover:border-ink transition-all duration-150">
          ← Re-upload
        </button>
        <button onClick={onConfirm} className="bg-ink text-paper border border-ink px-4 py-[9px] rounded-full font-sans text-[13px] cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150">
          Confirm &amp; analyze →
        </button>
      </div>
    </>
  );
}

/* ─── Step 3: Chat ─── */
function ChatStep({
  parsed, thread, thinking, onSend, onBack, onSave,
}: {
  parsed: ParsedWorkout;
  thread: ChatMessage[];
  thinking: boolean;
  onSend: (text: string) => void;
  onBack: () => void;
  onSave: () => void;
}) {
  const [input, setInput] = useState('');
  const threadRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread, thinking]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || thinking) return;
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSend(text);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 140) + 'px';
  };

  const SUGGESTIONS = [
    "How does this compare to last week's tempo?",
    'Why did km 7 fade?',
    'What should I do tomorrow?',
  ];

  return (
    <>
      {/* Scrollable body with thread */}
      <div className="flex-1 overflow-hidden px-7 pt-7 flex flex-col min-h-0">
        {/* Chat head */}
        <div className="pb-[18px] border-b border-rule mb-[18px] shrink-0">
          <div className="font-sans text-[11px] tracking-[0.14em] uppercase text-ink-4 mb-2">
            Session analysis · live
          </div>
          <h3 className="font-serif text-[24px] italic text-ink">
            {parsed.type} · {parsed.distance.toFixed(2)}km in {parsed.duration}
          </h3>
          <div className="flex gap-[18px] font-mono text-[11.5px] text-ink-3 mt-1.5 tabular-nums">
            <span>Pace {parsed.avgPace}/km</span>
            <span>HR {parsed.avgHr}</span>
            <span>Cad {parsed.avgCadence}</span>
            <span>VO {parsed.verticalOscillation}cm</span>
          </div>
        </div>

        {/* Thread */}
        <div ref={threadRef} className="flex-1 overflow-y-auto flex flex-col gap-[18px] pr-2 pb-4">
          {thread.map((m, i) => (
            <MsgBlock key={i} role={m.role} text={m.text} />
          ))}
          {thinking && (
            <div className="flex flex-col gap-1.5">
              <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">Coach</span>
              <div className="font-sans text-[14.5px] leading-[1.55] text-ink-4 italic">
                <span className="dots"><i /><i /><i /></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggestions */}
      <div className="px-7 pt-0 pb-2 flex gap-[6px] flex-wrap shrink-0">
        {SUGGESTIONS.map(s => (
          <button
            key={s}
            onClick={() => onSend(s)}
            disabled={thinking}
            className="bg-transparent border border-rule rounded-full px-3 py-[5px] font-sans text-[11.5px] text-ink-3 cursor-pointer hover:border-ink hover:text-ink transition-colors duration-150 disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-7 pt-3 pb-4 border-t border-rule shrink-0">
        <form
          onSubmit={submit}
          className="flex gap-[10px] items-end border border-rule rounded-sm px-3 py-[10px] bg-paper focus-within:border-ink transition-colors duration-150"
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={onInput}
            onKeyDown={onKey}
            placeholder="Ask about this session…"
            disabled={thinking}
            className="flex-1 border-0 outline-none bg-transparent font-sans text-[13.5px] text-ink resize-none leading-[1.5] min-h-[22px] placeholder:text-ink-4 disabled:opacity-50"
            style={{ maxHeight: 140 }}
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="bg-ink text-paper border-0 rounded-full px-3.5 py-[7px] font-sans text-[12px] cursor-pointer hover:bg-accent transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            Send
          </button>
        </form>
      </div>

      {/* Foot */}
      <div className="px-7 py-3.5 border-t border-rule flex justify-between items-center shrink-0">
        <button onClick={onBack} className="bg-transparent text-ink-2 border border-rule px-4 py-[9px] rounded-full font-sans text-[13px] cursor-pointer hover:text-ink hover:border-ink transition-all duration-150">
          ← Back
        </button>
        <button onClick={onSave} className="bg-ink text-paper border border-ink px-4 py-[9px] rounded-full font-sans text-[13px] cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150">
          Save workout
        </button>
      </div>
    </>
  );
}

/* ─── Message block ─── */
function MsgBlock({ role, text }: { role: 'user' | 'ai'; text: string }) {
  if (role === 'user') {
    return (
      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-accent">You</span>
        <div className="font-serif italic text-[18px] leading-[1.4] text-ink">{text}</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">Coach</span>
      <div
        className="font-sans text-[14.5px] leading-[1.55] text-ink-2 text-pretty [&_strong]:text-ink [&_strong]:font-semibold [&_em]:text-accent [&_em]:italic [&_p]:mb-[10px] [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:pl-[18px] [&_li]:mb-1"
        dangerouslySetInnerHTML={{ __html: renderMd(text) }}
      />
    </div>
  );
}
