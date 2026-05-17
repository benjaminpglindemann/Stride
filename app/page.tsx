import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server-client';
import { supabaseAdmin } from '@/lib/supabase-server';
import { getWeeksForAthlete, getSessionsThisWeek } from '@/lib/db-queries';
import Dashboard from '@/components/dashboard';
import { todaysRx, plannerRec } from '@/lib/mock-data';
import type { Athlete } from '@/types';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  let { data: row } = await supabaseAdmin
    .from('athletes').select('*').eq('id', user.id).single();

  // Auto-create athlete profile on first visit if registration didn't insert it
  if (!row) {
    const defaultName = user.email?.split('@')[0] ?? 'Athlete';
    await supabaseAdmin.from('athletes').insert({
      id:            user.id,
      email:         user.email ?? '',
      name:          defaultName,
      sport:         'running',
      goal:          '',
      training_plan: '',
      units:         'metric',
      coaching_notes: '',
    });
    const { data: created } = await supabaseAdmin
      .from('athletes').select('*').eq('id', user.id).single();
    row = created;
  }

  const [weeks, sessionsThisWeek] = await Promise.all([
    getWeeksForAthlete(supabaseAdmin, user.id),
    getSessionsThisWeek(supabaseAdmin, user.id),
  ]);

  const athlete: Athlete = row
    ? {
        name:          row.name,
        initials:      row.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
        sport:         row.sport,
        goal:          row.goal,
        units:         row.units,
        plan:          row.training_plan,
        coachingNotes: row.coaching_notes ?? '',
      }
    : {
        name:     user.email?.split('@')[0] ?? 'Athlete',
        initials: (user.email?.[0] ?? 'A').toUpperCase(),
        sport:    'running',
        goal:     '',
        units:    'metric',
        plan:     '',
      };

  const hasWorkouts = weeks.length > 0;
  const briefText   = hasWorkouts
    ? ''
    : "The first run's always the hardest. Upload it below and the coach will have something real to say.";

  return (
    <Dashboard
      athlete={athlete}
      weeks={weeks}
      sessionsThisWeek={sessionsThisWeek}
      briefText={briefText}
      hasWorkouts={hasWorkouts}
      rx={todaysRx}
      plannerRec={plannerRec}
    />
  );
}
