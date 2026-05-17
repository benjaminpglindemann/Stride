export const maxDuration = 30;
import { getAuthUser } from '@/lib/auth-user';
import { supabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const user = await getAuthUser(request);
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { data: workouts } = await supabaseAdmin.from('workouts').select('id,started_at,workout_type,distance_m,avg_pace_s_per_km,avg_hr,max_hr,avg_cadence,avg_vertical_oscillation_cm,elevation_gain_m,splits,user_note,duration_seconds').eq('athlete_id', user.id).order('started_at', { ascending: false });
  if (!workouts) return Response.json([]);
  const secToMmSs = (s: number) => `${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
  return Response.json(workouts.map(w => {
    const splits: any[] = w.splits ?? [];
    const paceNums = splits.map((s: any) => { const p = (s.pace ?? '').split(':').map(Number); return p.length===2 ? p[0]*60+p[1] : 0; }).filter((n: number) => n > 0);
    return { id: w.id, startedAt: w.started_at, type: w.workout_type ?? 'Run', distance: parseFloat(((w.distance_m||0)/1000).toFixed(2)), duration: secToMmSs(w.duration_seconds??0), avgPace: w.avg_pace_s_per_km ? secToMmSs(w.avg_pace_s_per_km) : '0:00', avgPaceSec: w.avg_pace_s_per_km??0, avgHr: w.avg_hr??0, maxHr: w.max_hr??0, avgCadence: w.avg_cadence??0, verticalOscillation: w.avg_vertical_oscillation_cm??0, elevation: w.elevation_gain_m??0, paceNums, excerpt: w.user_note??'' };
  }));
}
