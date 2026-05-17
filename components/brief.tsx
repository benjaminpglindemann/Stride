'use client';

import { useState } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import type { Prescription } from '@/types';

interface BriefProps {
  initialText: string;
  hasWorkouts: boolean;
  rx: Prescription;
}

export default function Brief({ initialText, hasWorkouts, rx }: BriefProps) {
  const [briefText, setBriefText] = useState(initialText);
  const [loading, setLoading] = useState(false);
  const [generatedTime, setGeneratedTime] = useState<string | null>(null);

  const regenerate = async () => {
    setLoading(true);
    setBriefText('');
    try {
      const res = await apiFetch('/api/coach/brief', { method: 'POST' });
      if (!res.ok || !res.body) throw new Error('API error');
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let text = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setBriefText(text.replace(/\*(.+?)\*/g, '<em>$1</em>'));
      }
      setGeneratedTime(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false }));
    } catch {
      setBriefText(initialText);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid [grid-template-columns:1.4fr_1fr] gap-14 pt-10">

      {/* Left — prose */}
      <div className="flex flex-col gap-[18px]">
        {/* Byline */}
        <div className="font-sans text-[11.5px] text-ink-4 tracking-[0.08em] uppercase flex items-center gap-[10px]">
          <span className="whitespace-nowrap">Today&apos;s brief</span>
          <span className="flex-1 h-px bg-rule" />
          {generatedTime && (
            <span className="whitespace-nowrap">Generated {generatedTime}</span>
          )}
        </div>

        {/* Drop */}
        {loading ? (
          <p className="font-serif text-[26px] leading-[1.32] tracking-[-0.012em] text-ink-4 italic text-pretty">
            Reading your training data and context…{' '}
            <span className="dots"><i /><i /><i /></span>
          </p>
        ) : (
          <div
            className="font-serif text-[26px] leading-[1.32] tracking-[-0.012em] text-ink text-pretty [&_em]:text-accent [&_em]:italic"
            dangerouslySetInnerHTML={{ __html: briefText }}
          />
        )}

        {/* Refresh — only shown once the user has workouts */}
        {hasWorkouts && (
          <button
            onClick={regenerate}
            disabled={loading}
            className="self-start bg-transparent border border-rule px-3 py-1.5 rounded-full font-sans text-[12px] text-ink-3 flex items-center gap-2 hover:border-ink hover:text-ink transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>↻</span>
            <span>{loading ? 'Regenerating…' : 'Regenerate from latest data'}</span>
          </button>
        )}
      </div>

      {/* Right — Prescription */}
      <aside className="bg-paper-2 border border-rule rounded-lg p-6 flex flex-col gap-[18px] relative">
        <div className="absolute top-0 left-6 right-6 h-[3px] bg-accent rounded-t-sm" />

        <div className="flex justify-between items-baseline">
          <div>
            <div className="font-sans text-[10.5px] tracking-[0.18em] uppercase text-ink-4 mb-1.5">
              Today&apos;s prescription
            </div>
            <div className="font-serif text-[28px] italic tracking-[-0.015em] text-ink">{rx.type}</div>
          </div>
          <span className="font-mono text-[10.5px] tracking-[0.06em] text-ink-3 px-2 py-[3px] border border-rule rounded-full bg-paper whitespace-nowrap">
            {rx.tag}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-px bg-rule border border-rule rounded-sm overflow-hidden">
          {[
            { label: 'Distance', value: rx.distance },
            { label: 'Pace',     value: rx.paceRange },
            { label: 'HR',       value: rx.hrTarget },
          ].map(({ label, value }) => (
            <div key={label} className="bg-paper-2 px-3.5 py-3 flex flex-col gap-1">
              <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">{label}</span>
              <span className="font-mono text-[18px] text-ink tracking-[-0.02em] tabular-nums">{value}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">Focus points</span>
          <ol className="rx-focus-list">
            {rx.focus.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ol>
        </div>
      </aside>

    </section>
  );
}
