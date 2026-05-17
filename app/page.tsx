import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server-client';
import { getWeeksForAthlete, getSessionsThisWeek } from '@/lib/db-queries';
import Dashboard from '@/components/dashboard';
import { todaysRx, plannerRec } from '@/lib/mock-data';
import type { Athlete } from '@/types';

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: row }, weeks, sessionsThisWeek] = await Promise.all([
    supabase.from('athletes').select('*').eq('id', user.id).single(),
    getWeeksForAthlete(supabase, user.id),
    getSessionsThisWeek(supabase, user.id),
  ]);

  const athlete: Athlete = row
    ? {
        name:     row.name,
        initials: row.name.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase(),
        sport:    row.sport,
        goal:     row.goal,
        units:    row.units,
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
    ? ''   // empty — Brief will generate live on first load
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
