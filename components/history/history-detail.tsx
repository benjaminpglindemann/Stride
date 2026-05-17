'use client';

import { useState, useEffect, useRef } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/topbar';
import { renderMd } from '@/lib/utils';
import type { Athlete } from '@/types';

interface Workout {
  id: string; startedAt: string; type: string; distance: number; duration: string;
  avgPace: string; avgPaceSec: number; avgHr: number; maxHr: number; avgCadence: number;
  verticalOscillation: number; elevation: number;
  splits: { km: number; pace: string; hr: number; cadence: number; paceFrac: number }[];
  userNote: string;
  transcript: { role: 'user' | 'ai'; text: string }[];
}

const DUMMY: Athlete = { name: '', initials: '', sport: 'running', goal: '', units: 'metric', plan: '' };

export default function HistoryDetail({ workoutId }: { workoutId: string }) {
  const router = useRouter();
  const [workout,  setWorkout]  = useState<Workout | null>(null);
  const [athlete,  setAthlete]  = useState<Athlete>(DUMMY);
  const [thread,   setThread]   = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input,    setInput]    = useState('');
  const [thinking, setThinking] = useState(false);
  const threadRef  = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    Promise.all([
      apiFetch(`/api/workouts/${workoutId}`).then(r => r.ok ? r.json() : null),
      apiFetch('/api/athlete/me').then(r => r.ok ? r.json() : null),
    ]).then(([w, a]) => {
      if (w) { setWorkout(w); setThread(w.transcript ?? []); }
      if (a?.name) setAthlete(a);
    });
  }, [workoutId]);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: 'smooth' });
  }, [thread, thinking]);

  const send = async (text: string) => {
    if (!workout) return;
    const next = [...thread, { role: 'user' as const, text }];
    setThread(next);
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setThinking(true);
    let aiText = '';
    setThread(t => [...t, { role: 'ai', text: '' }]);
    try {
      const workoutContext = `${workout.type}, ${workout.distance}km in ${workout.duration}, avg ${workout.avgPace}/km, HR ${workout.avgHr} (max ${workout.maxHr}), cadence ${workout.avgCadence}spm`;
      const res = await apiFetch('/api/coach/history-chat', {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workoutId, thread: next.slice(0, -1), message: text, workoutContext }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      const reader = res.body.getReader(); const dec = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        aiText += dec.decode(value, { stream: true });
        setThread(t => [...t.slice(0, -1), { role: 'ai', text: aiText }]);
      }
    } catch {
      setThread(t => [...t.slice(0, -1), { role: 'ai', text: 'Connection dropped. Try again.' }]);
    } finally { setThinking(false); }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || thinking) return;
    send(input.trim());
  };

  const secToMmSs = (s: number) => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;

  if (!workout) {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <Topbar athlete={DUMMY} activePage="Workout history" />
        <div className="flex-1 flex items-center justify-center">
          <p className="font-serif italic text-[22px] text-ink-3">Loading…</p>
        </div>
      </div>
    );
  }

  const d = new Date(workout.startedAt);
  const dayName  = d.toLocaleDateString('en-US', { weekday: 'long' });
  const fullDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const duration = secToMmSs(workout.duration === '0:00' ? 0 :
    (() => { const p = workout.duration.split(':').map(Number); return p.length === 2 ? p[0]*60+p[1] : p[0]*3600+p[1]*60+p[2]; })());

  // Comparative chart: pace vs flat average
  const splitPaces = workout.splits?.map(s => {
    const parts = s.pace.split(':').map(Number);
    return parts[0]*60 + (parts[1]??0);
  }) ?? [];

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Topbar athlete={athlete} activePage="Workout history" />

      <main className="max-w-[1320px] mx-auto px-12 pb-24 w-full">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 pt-6 pb-2 font-sans text-[13px] text-ink-4">
          <button onClick={() => router.back()} className="hover:text-ink cursor-pointer bg-transparent border-0 p-0">
            ← Workout history
          </button>
          <span>/</span>
          <span>{fullDate}</span>
        </div>

        {/* Masthead */}
        <div className="pt-5 pb-7 border-b border-rule flex items-end justify-between gap-8">
          <div>
            <div className="font-sans text-[12px] text-ink-3 tracking-[0.06em] uppercase flex items-center gap-[18px]">
              <span>{dayName}, {fullDate.replace(/,.*/, '')}</span>
              <span className="inline-block w-[3px] h-[3px] rounded-full bg-ink-4" />
              <span>{workout.type}</span>
            </div>
            <h1 className="font-serif text-[46px] leading-[1.0] tracking-[-0.02em] mt-3 text-ink">
              <em className="italic text-accent">{workout.type.toLowerCase()}</em>
              {' '}· {workout.distance.toFixed(2)}km in {workout.duration || duration}
            </h1>
          </div>
          <div className="font-sans text-[13px] text-ink-3 text-right flex flex-col gap-[6px] shrink-0">
            <span>Avg pace · <strong className="text-ink font-semibold">{workout.avgPace}/km</strong></span>
            <span>HR <strong className="text-ink font-semibold">{workout.avgHr}</strong> · max {workout.maxHr}</span>
            <span>Cadence <strong className="text-ink font-semibold">{workout.avgCadence}</strong> · VO {workout.verticalOscillation}cm</span>
          </div>
        </div>

        {/* Two-column grid */}
        <div className="grid grid-cols-[1fr_1.05fr] gap-14 mt-10">

          {/* Left: data + chart + splits */}
          <div className="flex flex-col gap-8">
            <div>
              <div className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4 mb-3">The data</div>
              <div className="border border-rule rounded-sm overflow-hidden">
                {[
                  ['Distance',       `${workout.distance.toFixed(2)} km`],
                  ['Duration',       workout.duration || duration],
                  ['Avg pace',       `${workout.avgPace} /km`],
                  ['Avg HR · max',   `${workout.avgHr} · ${workout.maxHr} bpm`],
                  ['Avg cadence',    `${workout.avgCadence} spm`],
                  ['Vert. osc.',     `${workout.verticalOscillation} cm`],
                  ['Elev. gain',     `${workout.elevation} m`],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-baseline px-4 py-2.5 border-b border-rule-soft last:border-0">
                    <span className="font-sans text-[11px] tracking-[0.1em] uppercase text-ink-4">{label}</span>
                    <span className="font-mono text-[14px] text-ink tabular-nums">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {splitPaces.length > 1 && (
              <div>
                <div className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4 mb-3">
                  Pace, this session
                </div>
                <ComparativeChart paces={splitPaces} avgPace={workout.avgPaceSec} />
              </div>
            )}

            {workout.splits && workout.splits.length > 0 && (
              <div>
                <div className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4 mb-3">Splits</div>
                <div>
                  <div className="grid [grid-template-columns:40px_60px_1fr_50px_50px] gap-3 pb-2 font-sans text-[10px] tracking-[0.12em] uppercase text-ink-4">
                    <span>KM</span><span>Pace</span><span /><span>HR</span><span>Cad</span>
                  </div>
                  {workout.splits.map((s, i) => {
                    const fastest = Math.min(...splitPaces);
                    const slowest = Math.max(...splitPaces);
                    const range   = slowest - fastest || 1;
                    const frac    = 1 - ((splitPaces[i] - fastest) / range);
                    return (
                      <div key={i} className="grid [grid-template-columns:40px_60px_1fr_50px_50px] gap-3 py-1.5 border-t border-rule-soft items-center">
                        <span className="font-mono text-[11px] text-ink-4 tabular-nums">km {s.km}</span>
                        <span className="font-mono text-[13px] text-ink tabular-nums">{s.pace}</span>
                        <div className="h-[6px] bg-paper-2 rounded-full overflow-hidden">
                          <div className="h-full bg-ink rounded-full" style={{ width: `${30 + frac * 70}%` }} />
                        </div>
                        <span className="font-mono text-[11px] text-ink-3 tabular-nums">{s.hr}</span>
                        <span className="font-mono text-[11px] text-ink-3 tabular-nums">{s.cadence}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right: conversation */}
          <div className="flex flex-col">
            <div className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4 mb-3">The conversation</div>
            <div className="border border-rule rounded-lg flex flex-col flex-1 overflow-hidden bg-paper">
              <div ref={threadRef} className="flex-1 overflow-y-auto p-6 flex flex-col gap-[18px]" style={{ maxHeight: 560 }}>
                {thread.length === 0 && (
                  <p className="font-serif italic text-[15px] text-ink-3">No conversation saved for this session.</p>
                )}
                {thread.map((m, i) => (
                  <div key={i} className="flex flex-col gap-1.5">
                    <span className={`font-sans text-[10px] tracking-[0.14em] uppercase ${m.role === 'user' ? 'text-accent' : 'text-ink-4'}`}>
                      {m.role === 'user' ? 'You' : 'Coach'}
                    </span>
                    {m.role === 'user' ? (
                      <div className="font-serif italic text-[18px] leading-[1.4] text-ink">{m.text}</div>
                    ) : (
                      <div
                        className="font-sans text-[14.5px] leading-[1.55] text-ink-2 text-pretty [&_strong]:text-ink [&_strong]:font-semibold [&_em]:text-accent [&_em]:italic [&_p]:mb-[10px] [&_p:last-child]:mb-0 [&_ul]:my-2 [&_ul]:pl-[18px] [&_li]:mb-1"
                        dangerouslySetInnerHTML={{ __html: renderMd(m.text) }}
                      />
                    )}
                  </div>
                ))}
                {thinking && (
                  <div className="flex flex-col gap-1.5">
                    <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">Coach</span>
                    <div className="font-sans text-[14.5px] text-ink-4 italic">
                      <span className="dots"><i /><i /><i /></span>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-rule p-4">
                <form onSubmit={submit} className="flex gap-2.5 items-end border border-rule rounded-sm px-3 py-2.5 bg-paper focus-within:border-ink transition-colors">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    placeholder="Continue the conversation…"
                    disabled={thinking}
                    className="flex-1 border-0 outline-none bg-transparent font-sans text-[13.5px] text-ink resize-none leading-[1.5] min-h-[22px] placeholder:text-ink-4 disabled:opacity-50"
                    style={{ maxHeight: 140 }}
                    onChange={e => {
                      setInput(e.target.value);
                      const el = e.target; el.style.height = 'auto';
                      el.style.height = Math.min(el.scrollHeight, 140) + 'px';
                    }}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
                  />
                  <button
                    type="submit" disabled={thinking || !input.trim()}
                    className="bg-ink text-paper border-0 rounded-full px-3.5 py-[7px] font-sans text-[12px] cursor-pointer hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                  >
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ComparativeChart({ paces, avgPace }: { paces: number[]; avgPace: number }) {
  const W = 600, H = 160, padL = 38, padR = 16, padT = 14, padB = 24;
  const plotW = W - padL - padR, plotH = H - padT - padB;
  const min = Math.min(...paces, avgPace - 5);
  const max = Math.max(...paces, avgPace + 5);
  const range = max - min || 1;
  const xAt = (i: number) => padL + (i / (paces.length - 1)) * plotW;
  const yAt = (s: number) => padT + ((s - min) / range) * plotH;
  const d = paces.map((s, i) => `${i === 0 ? 'M' : 'L'} ${xAt(i).toFixed(1)} ${yAt(s).toFixed(1)}`).join(' ');
  const baseY = yAt(avgPace);
  const fmt   = (s: number) => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
  const step  = Math.ceil((range / 4) / 10) * 10;
  const ticks = Array.from({ length: 5 }, (_, i) => Math.ceil(min / step) * step + i * step).filter(t => t >= min && t <= max);

  return (
    <div className="rounded-sm border border-rule overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="block w-full h-auto">
        {ticks.map(t => (
          <g key={t}>
            <line x1={padL} x2={W-padR} y1={yAt(t)} y2={yAt(t)} stroke="var(--rule-soft)" strokeWidth="1" />
            <text x={padL-6} y={yAt(t)+3} fontSize="9" fill="var(--ink-4)" fontFamily="var(--font-mono)" textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        <line x1={padL} x2={W-padR} y1={baseY} y2={baseY} stroke="var(--ink-3)" strokeWidth="1" strokeDasharray="4 4" />
        <text x={W-padR-4} y={baseY-4} fontSize="9" fill="var(--ink-3)" fontFamily="var(--font-sans)" textAnchor="end">avg {fmt(avgPace)}/km</text>
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {paces.map((s, i) => <circle key={i} cx={xAt(i)} cy={yAt(s)} r="2.5" fill="var(--accent)" />)}
        {paces.map((_, i) => (i % Math.max(1, Math.floor(paces.length / 6)) === 0 || i === paces.length - 1) && (
          <text key={i} x={xAt(i)} y={H-8} fontSize="9" fill="var(--ink-4)" fontFamily="var(--font-mono)" textAnchor="middle">km {i+1}</text>
        ))}
      </svg>
    </div>
  );
}
