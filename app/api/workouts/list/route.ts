export const maxDuration = 30;

import { createRouteClient } from '@/lib/supabase-route-client';

export async function GET(request: Request) {
  const supabase = createRouteClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { data: workouts } = await supabase
    .from('workouts')
    .select('id, started_at, workout_type, distance_m, avg_pace_s_per_km, avg_hr, max_hr, avg_cadence, avg_vertical_oscillation_cm, elevation_gain_m, splits, user_note, duration_seconds')
    .eq('athlete_id', user.id)
    .order('started_at', { ascending: false });

  if (!workouts) return Response.json([]);

  const secToMmSs = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  const mapped = workouts.map(w => {
    const splits: { pace: string; paceFrac: number }[] = w.splits ?? [];
    const paceNums = splits
      .map((s: any) => typeof s.pace === 'string' ? s.pace.split(':').reduce((a: number, b: string, i: number) => i === 0 ? parseInt(b) * 60 : a + parseInt(b), 0) : 0)
      .filter((n: number) => n > 0);

    return {
      id:               w.id,
      startedAt:        w.started_at,
      type:             w.workout_type ?? 'Run',
      distance:         parseFloat((w.distance_m / 1000).toFixed(2)),
      duration:         secToMmSs(w.duration_seconds ?? 0),
      avgPace:          w.avg_pace_s_per_km ? secToMmSs(w.avg_pace_s_per_km) : '0:00',
      avgPaceSec:       w.avg_pace_s_per_km ?? 0,
      avgHr:            w.avg_hr ?? 0,
      maxHr:            w.max_hr ?? 0,
      avgCadence:       w.avg_cadence ?? 0,
      verticalOscillation: w.avg_vertical_oscillation_cm ?? 0,
      elevation:        w.elevation_gain_m ?? 0,
      paceNums,           // seconds per km for each split — used for sparkline
      excerpt:          w.user_note ?? '',
    };
  });

  return Response.json(mapped);
}
