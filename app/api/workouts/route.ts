import { createRouteClient } from '@/lib/supabase-route-client';
import { paceToSec } from '@/lib/utils';
import type { ParsedWorkout, ChatMessage } from '@/types';

export async function POST(request: Request) {
  const supabase = createRouteClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  const body = await request.json() as {
    parsed: ParsedWorkout;
    thread: ChatMessage[];
    note: string;
  };
  const { parsed, thread, note } = body;

  // Duration string → seconds
  const durParts = parsed.duration.split(':').map(Number);
  const durationSec = durParts.length === 2
    ? durParts[0] * 60 + durParts[1]
    : durParts[0] * 3600 + durParts[1] * 60 + (durParts[2] ?? 0);

  const { data: workout, error: workoutErr } = await supabase
    .from('workouts')
    .insert({
      athlete_id:                   user.id,
      source:                       'garmin_csv',
      filename:                     parsed.filename,
      started_at:                   new Date().toISOString(),
      duration_seconds:             durationSec,
      distance_m:                   parsed.distance * 1000,
      workout_type:                 parsed.type,
      avg_pace_s_per_km:            paceToSec(parsed.avgPace),
      avg_hr:                       parsed.avgHr,
      max_hr:                       parsed.maxHr,
      avg_cadence:                  parsed.avgCadence,
      avg_vertical_oscillation_cm:  parsed.verticalOscillation,
      avg_ground_contact_ms:        parsed.groundContactTime,
      elevation_gain_m:             parsed.elevation,
      splits:                       parsed.splits,
      raw_metrics:                  parsed,
      user_note:                    note || null,
    })
    .select('id')
    .single();

  if (workoutErr || !workout) {
    return Response.json({ error: workoutErr?.message ?? 'Insert failed' }, { status: 500 });
  }

  // Save chat transcript
  if (thread.length > 0) {
    const messages = thread.map(m => ({
      athlete_id: user.id,
      workout_id: workout.id,
      role:       m.role === 'ai' ? 'assistant' : 'user',
      content:    m.text,
    }));
    await supabase.from('messages').insert(messages);
  }

  // Refresh weekly summary materialized view (best-effort)
  try { await supabase.rpc('refresh_weekly_summary'); } catch { /* no-op */ }

  return Response.json({ id: workout.id });
}
