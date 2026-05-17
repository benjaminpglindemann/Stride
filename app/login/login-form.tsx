'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" />
      <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="••••••••" />

      {error && (
        <p className="font-sans text-[13px] text-accent">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-2 bg-ink text-paper border border-ink px-4 py-3 rounded-full font-sans text-[13px] cursor-pointer hover:bg-accent hover:border-accent transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

function Field({
  label, type, value, onChange, placeholder,
}: {
  label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-sans text-[11px] tracking-[0.12em] uppercase text-ink-4">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required
        className="border border-rule rounded-sm px-3.5 py-2.5 font-sans text-[14px] text-ink bg-paper outline-none focus:border-ink transition-colors duration-150 placeholder:text-ink-4"
      />
    </div>
  );
}
