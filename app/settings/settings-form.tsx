'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase-browser';

interface Props {
  name: string;
  goal: string;
  plan: string;
  coachingNotes: string;
  units: string;
}

export default function SettingsForm({ name, goal, plan, coachingNotes, units }: Props) {
  const [form, setForm] = useState({ name, goal, plan, coachingNotes, units });
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const [error,  setError]    = useState('');

  const set = (k: string) => (v: string) => {
    setForm(f => ({ ...f, [k]: v }));
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not signed in.'); setSaving(false); return; }

    const { error } = await supabase
      .from('athletes')
      .update({
        name:           form.name,
        goal:           form.goal,
        training_plan:  form.plan,
        coaching_notes: form.coachingNotes,
        units:          form.units,
        updated_at:     new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) setError(error.message);
    else setSaved(true);
    setSaving(false);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">

      <Field label="Name" value={form.name} onChange={set('name')} placeholder="Your name" />
      <Field label="Goal" value={form.goal} onChange={set('goal')} placeholder="Sub-38 minute 10K by April 2027"
        hint="Referenced in every analysis and recommendation." />

      <TextareaField
        label="Training plan"
        value={form.plan}
        onChange={set('plan')}
        placeholder={`e.g. Pfitzinger 18/55 base build\nMon: rest or 8km recovery\nTue: VO2 / threshold intervals…`}
        rows={7}
        hint="Paste your weekly schedule. The coach uses this as context for every session analysis."
      />

      <TextareaField
        label="Coaching notes"
        value={form.coachingNotes}
        onChange={set('coachingNotes')}
        placeholder={`Adjust how the coach talks to you. Examples:\n- Be more concise — 2 sentences max per reply\n- Always mention cadence in session analysis\n- I respond well to direct criticism, don't soften it\n- Focus on HR zones, I don't train by pace`}
        rows={5}
        hint="These instructions are prepended to every system prompt. Change the tone, focus, or style of the coach here."
      />

      {/* Units */}
      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-[11px] tracking-[0.12em] uppercase text-ink-4">Units</span>
        <div className="flex border border-rule rounded-full p-[3px] bg-paper gap-[2px] w-fit">
          {['metric', 'imperial'].map(u => (
            <button key={u} type="button" onClick={() => set('units')(u)}
              className={['px-4 py-1.5 font-sans text-[12px] rounded-full cursor-pointer border-0 transition-colors duration-150 capitalize',
                form.units === u ? 'bg-ink text-paper' : 'bg-transparent text-ink-3 hover:text-ink'].join(' ')}>
              {u}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="font-sans text-[13px] text-accent">{error}</p>}

      <button type="submit" disabled={saving}
        className="self-start bg-ink text-paper border border-ink px-5 py-3 rounded-full font-sans text-[13px] cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed">
        {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save changes'}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, placeholder, hint, type = 'text' }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; hint?: string; type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-[11px] tracking-[0.12em] uppercase text-ink-4">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="border border-rule rounded-sm px-3.5 py-2.5 font-sans text-[14px] text-ink bg-paper outline-none focus:border-ink transition-colors duration-150 placeholder:text-ink-4" />
      {hint && <span className="font-sans text-[12px] text-ink-4">{hint}</span>}
    </div>
  );
}

function TextareaField({ label, value, onChange, placeholder, rows, hint }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; rows: number; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-[11px] tracking-[0.12em] uppercase text-ink-4">{label}</label>
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="border border-rule rounded-sm px-3.5 py-2.5 font-sans text-[13px] text-ink bg-paper outline-none focus:border-ink transition-colors duration-150 placeholder:text-ink-4 resize-y" />
      {hint && <span className="font-sans text-[12px] text-ink-4">{hint}</span>}
    </div>
  );
}
