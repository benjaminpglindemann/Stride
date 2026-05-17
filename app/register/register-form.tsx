'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

const PLAN_PLACEHOLDER = `e.g. Pfitzinger 18/55 base build, week 6 of 12.
Mon: rest or 8km recovery
Tue: VO2 / threshold intervals
Wed: 10–12km steady
Thu: rest or easy 6km
Fri: tempo 6–8km @ MP+10s
Sat: long run, building to 22km
Sun: easy 8–10km`;

export default function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    sport: 'running', goal: '', plan: '', units: 'metric',
  });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();

    // 1. Create auth user
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    });

    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Sign-up failed.');
      setLoading(false);
      return;
    }

    // 2. Insert athlete profile via server API (uses service role to bypass RLS)
    const res = await fetch('/api/athlete/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id:            data.user.id,
        email:         form.email,
        name:          form.name,
        sport:         form.sport,
        goal:          form.goal,
        training_plan: form.plan,
        units:         form.units,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      setError(body || 'Profile creation failed.');
      setLoading(false);
      return;
    }

    router.push('/');
    router.refresh();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">

      {/* Name + Email */}
      <div className="grid grid-cols-2 gap-4">
        <TextField label="Name" value={form.name} onChange={set('name')} placeholder="Mara Holm" required />
        <TextField label="Email" type="email" value={form.email} onChange={set('email')} placeholder="mara@example.com" required />
      </div>

      <TextField label="Password" type="password" value={form.password} onChange={set('password')} placeholder="8+ characters" required />

      {/* Divider */}
      <div className="flex items-center gap-3 my-1">
        <span className="flex-1 h-px bg-rule" />
        <span className="font-sans text-[11px] tracking-[0.12em] uppercase text-ink-4">Your training context</span>
        <span className="flex-1 h-px bg-rule" />
      </div>

      <TextField
        label="Goal"
        value={form.goal}
        onChange={set('goal')}
        placeholder="Sub-38 minute 10K by April 2027"
        required
        hint="The coach references this in every analysis."
      />

      <div className="flex flex-col gap-1.5">
        <label className="font-sans text-[11px] tracking-[0.12em] uppercase text-ink-4">
          Training plan
          <span className="ml-2 normal-case tracking-normal text-ink-4 opacity-70">(paste your weekly schedule)</span>
        </label>
        <textarea
          value={form.plan}
          onChange={e => set('plan')(e.target.value)}
          placeholder={PLAN_PLACEHOLDER}
          rows={6}
          className="border border-rule rounded-sm px-3.5 py-2.5 font-sans text-[13px] text-ink bg-paper outline-none focus:border-ink transition-colors duration-150 placeholder:text-ink-4 resize-y"
        />
        <span className="font-sans text-[12px] text-ink-4">You can update this any time in Profile settings.</span>
      </div>

      {/* Units toggle */}
      <div className="flex flex-col gap-1.5">
        <span className="font-sans text-[11px] tracking-[0.12em] uppercase text-ink-4">Units</span>
        <div className="flex border border-rule rounded-full p-[3px] bg-paper gap-[2px] w-fit">
          {['metric', 'imperial'].map(u => (
            <button
              key={u}
              type="button"
              onClick={() => set('units')(u)}
              className={[
                'px-4 py-1.5 font-sans text-[12px] rounded-full cursor-pointer border-0 transition-colors duration-150 capitalize',
                form.units === u ? 'bg-ink text-paper' : 'bg-transparent text-ink-3 hover:text-ink',
              ].join(' ')}
            >
              {u}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="font-sans text-[13px] text-accent">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="mt-1 bg-ink text-paper border border-ink px-4 py-3 rounded-full font-sans text-[13px] cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating account…' : 'Create account →'}
      </button>
    </form>
  );
}

function TextField({
  label, type = 'text', value, onChange, placeholder, required, hint,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  required?: boolean; hint?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-[11px] tracking-[0.12em] uppercase text-ink-4">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="border border-rule rounded-sm px-3.5 py-2.5 font-sans text-[14px] text-ink bg-paper outline-none focus:border-ink transition-colors duration-150 placeholder:text-ink-4"
      />
      {hint && <span className="font-sans text-[12px] text-ink-4">{hint}</span>}
    </div>
  );
}
