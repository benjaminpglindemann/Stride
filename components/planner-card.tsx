'use client';

import { useState, useRef, useEffect } from 'react';
import { apiFetch } from '@/lib/api-fetch';
import type { Athlete, Week, PlannerRec, ChatMessage } from '@/types';

interface Props {
  athlete: Athlete;
  rec: PlannerRec;
  weeks: Week[];
}

const SUGGESTIONS = [
  "Legs feel cooked — swap for easier?",
  "Why not threshold?",
  "Move to Sunday",
];

export default function PlannerCard({ athlete: _athlete, rec, weeks }: Props) {
  const [conv, setConv] = useState<ChatMessage[]>([]);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState('');
  const convRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (convRef.current) {
      convRef.current.scrollTop = convRef.current.scrollHeight;
    }
  }, [conv, thinking]);

  const send = async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', text };
    const nextConv = [...conv, userMsg];
    setConv(nextConv);
    setInput('');
    setThinking(true);

    // Streaming AI response
    let aiText = '';
    setConv(c => [...c, { role: 'ai', text: '' }]);
    try {
      const res = await apiFetch('/api/coach/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ thread: nextConv.slice(0, -1), message: text, rec }),
      });
      if (!res.ok || !res.body) throw new Error('API error');
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        aiText += decoder.decode(value, { stream: true });
        setConv(c => [...c.slice(0, -1), { role: 'ai', text: aiText }]);
      }
    } catch {
      setConv(c => [...c.slice(0, -1), { role: 'ai', text: 'Connection dropped. Try again.' }]);
    } finally {
      setThinking(false);
    }
  };

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || thinking) return;
    send(input.trim());
  };

  return (
    <div className="bg-paper border border-rule rounded-lg p-7 flex flex-col">
      <span className="font-sans text-[10.5px] tracking-[0.16em] uppercase text-accent mb-3">
        Next workout planner
      </span>
      <h3 className="font-serif text-[26px] italic text-ink mb-[10px]">
        Plan tomorrow&apos;s session.
      </h3>
      <p className="text-ink-3 text-[14px] leading-[1.5] mb-5 text-pretty">
        Generated from this week&apos;s load, your plan, and the days remaining to goal. Adjust below.
      </p>

      {/* Recommendation block */}
      <div className="border border-rule rounded-sm px-[18px] py-4 bg-paper flex flex-col gap-3.5">
        <div className="flex justify-between items-baseline">
          <span className="font-serif italic text-[20px] text-ink">{rec.type}</span>
          <span className="font-mono text-[11px] text-ink-3 tracking-[0.04em] uppercase">{rec.when}</span>
        </div>
        <div className="flex gap-[18px] font-mono text-[12.5px] text-ink-2 flex-wrap tabular-nums">
          {[['Distance', rec.distance], ['Pace', rec.pace], ['HR', rec.hr]].map(([lbl, val]) => (
            <span key={lbl}>
              <small className="font-sans text-ink-4 text-[10px] tracking-[0.1em] uppercase block mb-0.5">{lbl}</small>
              {val}
            </span>
          ))}
        </div>
        <p
          className="text-[13px] text-ink-2 leading-[1.5] text-pretty planner-focus"
          dangerouslySetInnerHTML={{ __html: rec.focus.replace(/marathon pace/g, '<em>marathon pace</em>') }}
        />
      </div>

      {/* Chat */}
      <div className="mt-4 flex flex-col gap-[10px]">

        {/* Conversation */}
        {conv.length > 0 || thinking ? (
          <div ref={convRef} className="flex flex-col gap-[10px] max-h-[200px] overflow-y-auto pr-1">
            {conv.map((m, i) => (
              <div
                key={i}
                className={[
                  'text-[13px] leading-[1.5] px-3 py-[10px] rounded-[6px] max-w-[92%]',
                  m.role === 'user'
                    ? 'bg-ink text-paper self-end'
                    : 'bg-paper-2 border border-rule-soft text-ink-2 self-start [&_strong]:text-accent',
                ].join(' ')}
                dangerouslySetInnerHTML={{ __html: m.text }}
              />
            ))}
            {thinking && (
              <div className="text-[13px] leading-[1.5] px-3 py-[10px] rounded-[6px] max-w-[92%] bg-paper-2 border border-rule-soft text-ink-4 italic self-start">
                <span className="dots"><i /><i /><i /></span>
              </div>
            )}
          </div>
        ) : null}

        {/* Suggestions */}
        <div className="flex gap-[6px] flex-wrap">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              disabled={thinking}
              className="bg-transparent border border-rule rounded-full px-[10px] py-1 font-sans text-[11.5px] text-ink-3 cursor-pointer hover:border-ink hover:text-ink transition-colors duration-150 disabled:opacity-40"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <form
          onSubmit={submit}
          className="flex gap-2 items-center border border-rule rounded-full p-1 pl-3.5 bg-paper focus-within:border-ink transition-colors duration-150"
        >
          <input
            type="text"
            placeholder="Ask, adjust, or swap…"
            value={input}
            onChange={e => setInput(e.target.value)}
            disabled={thinking}
            className="flex-1 border-0 outline-none bg-transparent font-sans text-[13px] text-ink py-2 placeholder:text-ink-4 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={thinking || !input.trim()}
            className="bg-ink text-paper border-0 rounded-full px-3.5 py-2 font-sans text-[12px] cursor-pointer hover:bg-accent transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
