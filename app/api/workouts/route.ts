import { getAuthUser } from '@/lib/auth-user';
import { supabaseAdmin } from '@/lib/supabase-server';
import { paceToSec } from '@/lib/utils';
import type { ParsedWorkout, ChatMessage } from '@/types';

export async function POST(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { parsed, thread, note } = await request.json() as { parsed: ParsedWorkout; thread: ChatMessage[]; note: string };
  const durParts = (parsed.duration || '0:00').split(':').map(Number);
  const durationSec = durParts.length === 2 ? durParts[0]*60+durParts[1] : durParts[0]*3600+durParts[1]*60+(durParts[2]??0);
  const { data: workout, error: workoutErr } = await supabaseAdmin.from('workouts').insert({
    athlete_id: user.id,
    source: 'garmin_csv',
    filename: parsed.filename,
    started_at: new Date().toISOString(),
    duration_seconds: durationSec,
    distance_m: parsed.distance * 1000,
    workout_type: parsed.type,
    avg_pace_s_per_km: paceToSec(parsed.avgPace),
    avg_hr: parsed.avgHr,
    max_hr: parsed.maxHr,
    avg_cadence: parsed.avgCadence,
    avg_vertical_oscillation_cm: parsed.verticalOscillation,
    avg_ground_contact_ms: parsed.groundContactTime,
    elevation_gain_m: parsed.elevation,
    splits: parsed.splits,
    raw_metrics: parsed,
    user_note: note || null,
  }).select('id').single();
  if (workoutErr || !workout) return Response.json({ error: workoutErr?.message ?? 'Insert failed' }, { status: 500 });
  if (thread.length > 0) {
    await supabaseAdmin.from('messages').insert(thread.map(m => ({ athlete_id: user.id, workout_id: workout.id, role: m.role === 'ai' ? 'assistant' : 'user', content: m.text })));
  }
  try { await supabaseAdmin.rpc('refresh_weekly_summary'); } catch { /* best-effort */ }
  return Response.json({ id: workout.id });
}
