import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server-client';
import { getWeeksForAthlete, getSessionsThisWeek } from '@/lib/db-queries';
import Dashboard from '@/components/dashboard';
import { todaysBrief, todaysRx, plannerRec } from '@/lib/mock-data';
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
        plan:     row.training_plan,
      }
    : {
        name:     user.email?.split('@')[0] ?? 'Athlete',
        initials: (user.email?.[0] ?? 'A').toUpperCase(),
        sport:    'running',
        goal:     '',
        units:    'metric',
        plan:     '',
      };

  return (
    <Dashboard
      athlete={athlete}
      weeks={weeks}
      sessionsThisWeek={sessionsThisWeek}
      briefText={todaysBrief.text}
      briefGeneratedAt={todaysBrief.generatedAt}
      rx={todaysRx}
      plannerRec={plannerRec}
    />
  );
}
