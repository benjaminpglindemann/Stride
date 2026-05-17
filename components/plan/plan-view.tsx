'use client';

import { useState, useEffect } from 'react';
import Topbar from '@/components/topbar';
import { parsePlanText, type PlanTemplate } from '@/lib/parse-plan';
import type { Athlete } from '@/types';

const DAY_ORDER = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const FULL_DAY: Record<string,string> = {
  Mon:'Monday',Tue:'Tuesday',Wed:'Wednesday',Thu:'Thursday',
  Fri:'Friday',Sat:'Saturday',Sun:'Sunday',
};
const KIND_TAG: Record<string, { color: string; border: string }> = {
  quality:  { color: 'var(--accent)',    border: 'var(--accent)' },
  long:     { color: 'var(--ink-blue)',  border: 'var(--ink-blue)' },
  steady:   { color: 'var(--ink-3)',     border: 'var(--rule)' },
  recovery: { color: 'var(--moss)',      border: 'var(--moss)' },
  rest:     { color: 'var(--ink-4)',     border: 'var(--rule-soft)' },
};

const DUMMY: Athlete = { name:'',initials:'',sport:'running',goal:'',units:'metric',plan:'' };

export default function PlanView() {
  const [athlete,  setAthlete]  = useState<Athlete>(DUMMY);
  const [loading,  setLoading]  = useState(true);
  const [template, setTemplate] = useState<PlanTemplate | null>(null);
  const [editing,  setEditing]  = useState(false);
  const [draft,    setDraft]    = useState('');
  const [saving,   setSaving]   = useState(false);

  useEffect(() => {
    fetch('/api/athlete/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(a => {
        if (a) {
          setAthlete(a);
          setDraft(a.plan ?? '');
          if (a.plan) setTemplate(parsePlanText(a.plan));
        }
        setLoading(false);
      });
  }, []);

  const savePlan = async () => {
    setSaving(true);
    await fetch('/api/athlete', {
      method: 'PATCH', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ training_plan: draft }),
    });
    setTemplate(parsePlanText(draft));
    setAthleteField('plan', draft);
    setEditing(false);
    setSaving(false);
  };

  const setAthleteField = (k: string, v: string) =>
    setAthlete(a => ({ ...a, [k]: v }));

  // 14-day lookahead (today = index 7)
  const today  = new Date();
  const todayKey = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][today.getDay()];
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7 + i);
    const key    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()];
    const plan   = template?.days[key];
    const offset = i - 7;
    const status = offset < 0 ? 'past' : offset === 0 ? 'today' : 'upcoming';
    const load   = !plan || plan.kind === 'rest' ? 0
                 : plan.kind === 'long' ? 0.92 : plan.kind === 'quality' ? 0.62
                 : plan.kind === 'steady' ? 0.48 : 0.22;
    return {
      date:    d,
      day:     d.toLocaleDateString('en-US', { weekday: 'short' }),
      dateNum: d.getDate(),
      key,
      plan,
      status,
      load,
    };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-paper flex flex-col">
        <Topbar athlete={DUMMY} activePage="Plan" />
        <div className="flex-1 flex items-center justify-center">
          <p className="font-serif italic text-[22px] text-ink-3">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Topbar athlete={athlete} activePage="Plan" />

      <main className="max-w-[1320px] mx-auto px-12 pb-24 w-full">
        {/* Masthead */}
        <div className="pt-9 pb-7 border-b border-rule flex items-end justify-between gap-8">
          <div>
            <div className="font-sans text-[12px] text-ink-3 tracking-[0.06em] uppercase flex items-center gap-[18px]">
              <span>The plan</span>
              <span className="inline-block w-[3px] h-[3px] rounded-full bg-ink-4" />
              <span>{template?.cycle ?? 'No plan set yet'}</span>
            </div>
            <h1 className="font-serif text-[64px] leading-[0.98] tracking-[-0.022em] mt-3.5 text-ink">
              Training <em className="italic text-accent">plan.</em>
            </h1>
          </div>
        </div>

        {/* 14-day strip */}
        {template && (
          <section className="mt-14">
            <div className="flex items-baseline justify-between mb-[18px] pb-3 border-b border-rule gap-4">
              <h2 className="font-serif text-[28px] text-ink">Fourteen days, at a glance</h2>
              <span className="font-sans text-[12px] text-ink-3 tracking-[0.06em] uppercase">Past seven · today · next six</span>
            </div>

            <div className="grid grid-cols-14 gap-0 border border-rule rounded-sm overflow-hidden" style={{ gridTemplateColumns: 'repeat(14, 1fr)' }}>
              {days.map((d, i) => {
                const isToday  = d.status === 'today';
                const isPast   = d.status === 'past';
                const kind     = d.plan?.kind ?? 'rest';
                const tagStyle = KIND_TAG[kind] ?? KIND_TAG.rest;
                return (
                  <div
                    key={i}
                    className={[
                      'flex flex-col border-r border-rule last:border-0 min-h-[120px] relative',
                      isToday ? 'bg-paper-2' : 'bg-paper',
                      isPast ? 'opacity-60' : '',
                    ].join(' ')}
                  >
                    {isToday && <div className="absolute top-0 left-0 right-0 h-[2px] bg-accent" />}

                    {/* Load track */}
                    <div className="h-8 relative border-b border-rule-soft flex items-end">
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-ink-4 opacity-30"
                        style={{ height: `${Math.round(d.load * 100)}%` }}
                      />
                    </div>

                    {/* Day body */}
                    <div className="flex flex-col items-center gap-0.5 px-1 py-2 text-center flex-1">
                      <span className="font-serif italic text-[11px] text-ink">{d.day}</span>
                      <span className="font-mono text-[10px] text-ink-4 tabular-nums">{d.dateNum}</span>
                      <span className={`text-[10px] mt-0.5 ${isToday ? 'text-accent' : isPast ? 'text-moss' : 'text-ink-4'}`}>
                        {isToday ? '●' : isPast ? '✓' : kind === 'rest' ? '—' : ''}
                      </span>
                      <span className="font-sans text-[9px] font-semibold text-ink-3 leading-tight mt-0.5 text-center">
                        {d.plan?.label ?? 'Rest'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Programme */}
        <section className="mt-14">
          <div className="flex items-baseline justify-between mb-[18px] pb-3 border-b border-rule gap-4">
            <h2 className="font-serif text-[28px] text-ink">The plan, set in type</h2>
            <span className="font-sans text-[12px] text-ink-3 tracking-[0.06em] uppercase">
              {editing ? 'Editing — save to update' : 'Weekly template'}
            </span>
          </div>

          {!template && !editing && (
            <div className="py-12 text-center">
              <p className="font-serif italic text-[22px] text-ink-3 mb-3">No training plan set.</p>
              <p className="font-sans text-[13px] text-ink-4 mb-6">Add your weekly schedule in Settings, or paste it here directly.</p>
              <button onClick={() => setEditing(true)} className="bg-ink text-paper border border-ink px-5 py-3 rounded-full font-sans text-[13px] cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150">
                Add training plan →
              </button>
            </div>
          )}

          {template && !editing && (
            <>
              <div className="flex flex-col gap-0 border border-rule rounded-sm overflow-hidden">
                {DAY_ORDER.map(key => {
                  const d = template.days[key];
                  const isToday = key === todayKey;
                  const tag = KIND_TAG[d.kind] ?? KIND_TAG.rest;
                  return (
                    <article
                      key={key}
                      className={['grid gap-7 px-6 py-5 border-b border-rule-soft last:border-0 relative', isToday ? 'bg-paper-2' : ''].join(' ')}
                      style={{ gridTemplateColumns: '160px 1fr 90px' }}
                    >
                      {isToday && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent" />}
                      <div className="flex flex-col gap-1 pl-1">
                        <span className="font-serif italic text-[22px] text-ink leading-tight">{FULL_DAY[key]}</span>
                        {isToday && <span className="font-sans text-[10px] tracking-[0.12em] uppercase text-accent">Today</span>}
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-sans text-[14px] font-semibold text-ink">{d.label}</span>
                        <span className="font-mono text-[12px] text-ink-3">{d.summary}</span>
                        {d.detail && d.detail !== d.summary && (
                          <p className="font-serif italic text-[14px] text-ink-2 leading-[1.5] text-pretty mt-1">{d.detail}</p>
                        )}
                      </div>
                      <div className="flex justify-end items-start">
                        <span
                          className="font-sans text-[10px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border"
                          style={{ color: tag.color, borderColor: tag.border }}
                        >
                          {d.kind}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-4">
                <button
                  onClick={() => { setDraft(athlete.plan ?? ''); setEditing(true); }}
                  className="bg-transparent text-ink-2 border border-rule px-4 py-[9px] rounded-full font-sans text-[13px] cursor-pointer hover:text-ink hover:border-ink transition-all duration-150"
                >
                  Edit plan
                </button>
                <span className="font-sans text-[11.5px] text-ink-4 italic">
                  Paste your weekly schedule — the page parses it automatically.
                </span>
              </div>
            </>
          )}

          {editing && (
            <div className="flex flex-col gap-4">
              <label className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">
                Training plan · free text
              </label>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                rows={14}
                placeholder={`e.g. Pfitzinger 18/55 base build, week 6 of 12.\nMon: rest or 8km recovery\nTue: VO2 / threshold intervals\nWed: 10–12km steady\n...`}
                className="border border-rule rounded-sm px-4 py-3 font-mono text-[13px] text-ink bg-paper-2 outline-none focus:border-ink transition-colors resize-y placeholder:text-ink-4"
              />
              <div className="flex items-center gap-3">
                <button onClick={() => setEditing(false)} className="bg-transparent text-ink-2 border border-rule px-4 py-[9px] rounded-full font-sans text-[13px] cursor-pointer hover:text-ink hover:border-ink transition-all duration-150">
                  Cancel
                </button>
                <button onClick={savePlan} disabled={saving} className="bg-ink text-paper border border-ink px-4 py-[9px] rounded-full font-sans text-[13px] cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150 disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save & parse →'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
