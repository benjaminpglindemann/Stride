import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server-client';
import SettingsForm from './settings-form';

export const metadata = { title: 'Settings — Stride' };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: athlete } = await supabase
    .from('athletes').select('name, goal, training_plan, coaching_notes, units').eq('id', user.id).single();

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-[640px] mx-auto px-6 py-16">

        <div className="flex items-center gap-2 mb-10">
          <a href="/" className="font-sans text-[13px] text-ink-4 hover:text-ink transition-colors">← Dashboard</a>
        </div>

        <h1 className="font-serif text-[32px] leading-[1.1] text-ink mb-1">Profile &amp; coaching</h1>
        <p className="font-sans text-[14px] text-ink-3 mb-10 text-pretty">
          The coach reads your goal, training plan, and any coaching notes before every response.
        </p>

        <SettingsForm
          name={athlete?.name ?? ''}
          goal={athlete?.goal ?? ''}
          plan={athlete?.training_plan ?? ''}
          coachingNotes={athlete?.coaching_notes ?? ''}
          units={athlete?.units ?? 'metric'}
        />
      </div>
    </div>
  );
}
