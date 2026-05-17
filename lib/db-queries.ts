import type { SupabaseClient } from '@supabase/supabase-js';
import type { Week, Session } from '@/types';

/* ── Weekly aggregation ── */

export function aggregateToWeeks(workouts: WorkoutRow[]): Week[] {
  const buckets = new Map<string, WorkoutRow[]>();

  for (const w of workouts) {
    const d = new Date(w.started_at);
    d.setDate(d.getDate() - d.getDay()); // floor to Sunday
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString();
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key)!.push(w);
  }

  return Array.from(buckets.entries()).map(([key, ws], idx) => {
    const weekStart = new Date(key);
    const km        = ws.reduce((s, w) => s + (w.distance_m ?? 0) / 1000, 0);
    const hrRows    = ws.filter(w => w.avg_hr);
    const cadRows   = ws.filter(w => w.avg_cadence);
    const voRows    = ws.filter(w => w.avg_vertical_oscillation_cm);
    const paceRows  = ws.filter(w => w.avg_pace_s_per_km);

    const avg = (arr: WorkoutRow[], key: keyof WorkoutRow) =>
      arr.reduce((s, w) => s + (w[key] as number), 0) / (arr.length || 1);

    const avgHr  = Math.round(avg(hrRows,  'avg_hr'));
    const avgCad = Math.round(avg(cadRows, 'avg_cadence'));
    const avgVo  = parseFloat(avg(voRows,  'avg_vertical_oscillation_cm').toFixed(1));
    const paces  = paceRows.map(w => w.avg_pace_s_per_km as number);
    const bestPaceSec = paces.length ? Math.min(...paces) : 300;
    const avgPaceSec  = paces.length ? paces.reduce((a, b) => a + b, 0) / paces.length : 330;

    return {
      km:         parseFloat(km.toFixed(1)),
      sessions:   ws.length,
      avgHr,
      avgCadence: avgCad,
      bestPace:   secToMmSs(bestPaceSec),
      vo:         avgVo,
      avgPace:    secToMmSs(avgPaceSec),
      label:      weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      idx,
    };
  });
}

/* ── Queries ── */

export async function getWeeksForAthlete(
  supabase: SupabaseClient,
  athleteId: string,
  days = 56,
): Promise<Week[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data } = await supabase
    .from('workouts')
    .select('started_at, distance_m, avg_hr, avg_cadence, avg_vertical_oscillation_cm, avg_pace_s_per_km')
    .eq('athlete_id', athleteId)
    .gte('started_at', since.toISOString())
    .order('started_at', { ascending: true });

  if (!data || data.length === 0) return [];
  return aggregateToWeeks(data as WorkoutRow[]);
}

export async function getSessionsThisWeek(
  supabase: SupabaseClient,
  athleteId: string,
): Promise<Session[]> {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from('workouts')
    .select('started_at, workout_type, distance_m, avg_pace_s_per_km, avg_hr, avg_cadence, user_note')
    .eq('athlete_id', athleteId)
    .gte('started_at', weekStart.toISOString())
    .order('started_at', { ascending: true });

  if (!data || data.length === 0) return [];
  return data.map(mapToSession);
}

/* ── Helpers ── */

function secToMmSs(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function mapToSession(w: any): Session {
  const d    = new Date(w.started_at);
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const pace = secToMmSs(w.avg_pace_s_per_km ?? 300);
  return {
    day:      DAYS[d.getDay()],
    date:     d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    type:     w.workout_type ?? 'Run',
    detail:   w.user_note?.slice(0, 40) ?? '',
    distance: parseFloat(((w.distance_m ?? 0) / 1000).toFixed(1)),
    pace,
    hr:       w.avg_hr ?? 0,
    cadence:  w.avg_cadence ?? 0,
  };
}

interface WorkoutRow {
  started_at: string;
  distance_m?: number;
  avg_hr?: number;
  avg_cadence?: number;
  avg_vertical_oscillation_cm?: number;
  avg_pace_s_per_km?: number;
}
