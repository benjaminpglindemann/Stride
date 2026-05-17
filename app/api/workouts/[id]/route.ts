export const maxDuration = 30;

import { createRouteClient } from '@/lib/supabase-route-client';
import { paceToSec } from '@/lib/utils';

export async function GET(
  request: Request,
  ctx: RouteContext<'/api/workouts/[id]'>,
) {
  const supabase = createRouteClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const { id } = await ctx.params;

  const { data: workout, error } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', id)
    .eq('athlete_id', user.id)
    .single();

  if (error || !workout) return new Response('Not found', { status: 404 });

  const { data: messages } = await supabase
    .from('messages')
    .select('role, content')
    .eq('workout_id', id)
    .order('created_at', { ascending: true });

  const secToMmSs = (s: number) =>
    `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;

  return Response.json({
    id:                     workout.id,
    startedAt:              workout.started_at,
    type:                   workout.workout_type ?? 'Run',
    filename:               workout.filename,
    durationSeconds:        workout.duration_seconds,
    distance:               parseFloat((workout.distance_m / 1000).toFixed(2)),
    avgPace:                workout.avg_pace_s_per_km ? secToMmSs(workout.avg_pace_s_per_km) : '0:00',
    avgPaceSec:             workout.avg_pace_s_per_km ?? 0,
    avgHr:                  workout.avg_hr ?? 0,
    maxHr:                  workout.max_hr ?? 0,
    avgCadence:             workout.avg_cadence ?? 0,
    verticalOscillation:    workout.avg_vertical_oscillation_cm ?? 0,
    elevation:              workout.elevation_gain_m ?? 0,
    splits:                 workout.splits ?? [],
    userNote:               workout.user_note ?? '',
    transcript:             (messages ?? []).map(m => ({
      role: m.role === 'assistant' ? 'ai' : 'user',
      text: m.content,
    })),
  });
}
