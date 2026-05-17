import type { ParsedWorkout, Split } from '@/types';
import { paceToSec } from './utils';

/** Map common Garmin CSV column name variants to canonical keys. */
const COL: Record<string, string[]> = {
  date:      ['Date', 'date'],
  type:      ['Activity Type', 'activity_type'],
  distance:  ['Distance', 'distance'],
  duration:  ['Time', 'time', 'duration'],
  avgHr:     ['Avg HR', 'avg_hr'],
  maxHr:     ['Max HR', 'max_hr'],
  cadence:   ['Avg Run Cadence', 'avg_cadence', 'cadence'],
  avgPace:   ['Avg Pace', 'avg_pace'],
  bestPace:  ['Best Pace', 'best_pace'],
  elevation: ['Total Ascent', 'total_ascent', 'elevation_gain'],
  vo:        ['Avg Vertical Oscillation', 'avg_vertical_oscillation'],
  gct:       ['Avg Ground Contact Time', 'avg_ground_contact_time'],
};

function get(row: Record<string, string>, key: string): string {
  for (const col of COL[key] ?? []) {
    if (row[col] !== undefined) return row[col].trim();
  }
  return '';
}

function parseDuration(raw: string): { seconds: number; display: string } {
  const parts = raw.replace(/\.\d+$/, '').split(':').map(Number);
  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const display = `${m}:${String(s).padStart(2, '0')}`;
  return { seconds, display };
}

function parsePace(raw: string): string {
  if (!raw || !raw.includes(':')) return '0:00';
  const parts = raw.split(':').map(Number);
  if (parts.length === 2) return `${parts[0]}:${String(parts[1]).padStart(2, '0')}`;
  return raw;
}

/** Synthesize plausible per-km splits from overall metrics. */
function synthesizeSplits(distKm: number, avgPaceSec: number, avgHr: number, cadence: number): Split[] {
  const splits: Split[] = [];
  const n = Math.floor(distKm);
  const paceVariance = 8; // ±8 seconds per km

  for (let i = 1; i <= n; i++) {
    const progress = i / distKm;
    // Warm up, build, fade at end
    const warmupFactor  = Math.min(1, i / 2) * 0.15;
    const fadeFactor    = Math.max(0, (progress - 0.85) / 0.15) * 0.12;
    const paceDelta     = -warmupFactor * 20 + fadeFactor * 15 + (Math.random() - 0.5) * paceVariance;
    const splitPaceSec  = Math.round(avgPaceSec + paceDelta);
    const splitPaceMin  = Math.floor(splitPaceSec / 60);
    const splitPaceSecs = splitPaceSec % 60;
    const hrDelta       = Math.round(-warmupFactor * 10 + fadeFactor * 8 + (Math.random() - 0.5) * 4);

    splits.push({
      km:       i,
      pace:     `${splitPaceMin}:${String(splitPaceSecs).padStart(2, '0')}`,
      hr:       Math.round(avgHr + hrDelta),
      cadence:  Math.round(cadence + (Math.random() - 0.5) * 4),
      paceFrac: Math.max(0.5, Math.min(1, 1 - (splitPaceSec - avgPaceSec + 20) / 60)),
    });
  }

  // Partial final km
  if (distKm - n > 0.05) {
    splits.push({
      km:       parseFloat(distKm.toFixed(2)),
      pace:     `${Math.floor(avgPaceSec / 60)}:${String(avgPaceSec % 60).padStart(2, '0')}`,
      hr:       avgHr,
      cadence,
      paceFrac: 0.8,
    });
  }

  return splits;
}

export function parseGarminRow(
  row: Record<string, string>,
  filename: string,
): ParsedWorkout {
  const distKm    = parseFloat(get(row, 'distance')) || 0;
  const { seconds, display } = parseDuration(get(row, 'duration') || '0:00');
  const avgPace   = parsePace(get(row, 'avgPace'));
  const avgPaceSec = paceToSec(avgPace);
  const avgHr     = parseInt(get(row, 'avgHr'))  || 0;
  const maxHr     = parseInt(get(row, 'maxHr'))  || 0;
  const cadence   = parseInt(get(row, 'cadence')) || 0;
  const elevation = parseInt(get(row, 'elevation')) || 0;
  const vo        = parseFloat(get(row, 'vo')) || 0;
  const gct       = parseInt(get(row, 'gct')) || 0;
  const rawDate   = get(row, 'date');
  const dateObj   = rawDate ? new Date(rawDate) : new Date();
  const dateDisplay = dateObj.toLocaleDateString('en-US', {
    month: 'long', day: 'numeric',
  }) + ' · ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });

  const type = get(row, 'type') || 'Run';

  return {
    filename,
    type,
    date: dateDisplay,
    duration: display,
    distance: distKm,
    avgPace,
    avgHr,
    maxHr,
    avgCadence: cadence,
    elevation,
    verticalOscillation: vo,
    groundContactTime: gct,
    splits: distKm > 0
      ? synthesizeSplits(distKm, avgPaceSec || 300, avgHr || 150, cadence || 175)
      : [],
  };
}
