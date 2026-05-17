import type { ParsedWorkout, Split } from '@/types';
import { paceToSec } from './utils';

/**
 * Column name variants per field — checked case-insensitively after BOM/whitespace stripping.
 * Garmin Connect exports different headers depending on language, sport, and watch model.
 */
const COL: Record<string, string[]> = {
  date:      ['date'],
  type:      ['activity type', 'type'],
  distance:  ['distance'],
  duration:  ['time', 'duration', 'elapsed time'],
  avgHr:     ['avg hr', 'average hr', 'avg heart rate'],
  maxHr:     ['max hr', 'maximum hr', 'max heart rate'],
  cadence:   ['avg run cadence', 'avg cadence', 'cadence', 'avg cycling cadence'],
  avgPace:   ['avg pace', 'average pace'],
  bestPace:  ['best pace'],
  elevation: ['total ascent', 'elevation gain', 'ascent'],
  vo:        ['avg vertical oscillation', 'vertical oscillation'],
  gct:       ['avg ground contact time', 'ground contact time'],
};

/** Normalise a CSV row so all keys are BOM-stripped, trimmed, lowercase. */
function normalizeRow(row: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(row)) {
    const clean = k.replace(/^﻿/u, '').trim().toLowerCase();
    out[clean] = (v ?? '').trim();
  }
  return out;
}

function get(norm: Record<string, string>, key: string): string {
  for (const col of COL[key] ?? []) {
    const val = norm[col];
    if (val !== undefined && val !== '' && val !== '--') return val;
  }
  return '';
}

function parseNum(raw: string): number {
  // Handle comma-decimal (e.g. German locale "8,39")
  return parseFloat(raw.replace(',', '.')) || 0;
}

function parseDuration(raw: string): { seconds: number; display: string } {
  const cleaned = raw.replace(/\.\d+$/, '');
  const parts = cleaned.split(':').map(Number);
  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return { seconds, display: `${m}:${String(s).padStart(2, '0')}` };
}

function parsePace(raw: string): string {
  if (!raw || !raw.includes(':')) return '0:00';
  const parts = raw.split(':').map(Number);
  return `${parts[0]}:${String(parts[1] ?? 0).padStart(2, '0')}`;
}

function synthesizeSplits(distKm: number, avgPaceSec: number, avgHr: number, cadence: number): Split[] {
  const splits: Split[] = [];
  const n = Math.floor(distKm);

  for (let i = 1; i <= n; i++) {
    const progress    = i / distKm;
    const warmup      = Math.min(1, i / 2) * 0.15;
    const fade        = Math.max(0, (progress - 0.85) / 0.15) * 0.12;
    const delta       = -warmup * 20 + fade * 15 + (Math.random() - 0.5) * 8;
    const splitSec    = Math.round(avgPaceSec + delta);
    const hrDelta     = Math.round(-warmup * 10 + fade * 8 + (Math.random() - 0.5) * 4);

    splits.push({
      km:       i,
      pace:     `${Math.floor(splitSec / 60)}:${String(splitSec % 60).padStart(2, '0')}`,
      hr:       Math.round(avgHr + hrDelta),
      cadence:  Math.round(cadence + (Math.random() - 0.5) * 4),
      paceFrac: Math.max(0.5, Math.min(1, 1 - (splitSec - avgPaceSec + 20) / 60)),
    });
  }

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
  rawRow: Record<string, string>,
  filename: string,
): ParsedWorkout {
  const row = normalizeRow(rawRow);

  const distKm     = parseNum(get(row, 'distance'));
  const { seconds, display } = parseDuration(get(row, 'duration') || '0:00');
  const avgPace    = parsePace(get(row, 'avgPace'));
  const avgPaceSec = paceToSec(avgPace) || (distKm > 0 && seconds > 0 ? Math.round(seconds / distKm) : 300);
  const avgHr      = parseInt(get(row, 'avgHr'))  || 0;
  const maxHr      = parseInt(get(row, 'maxHr'))  || 0;
  const cadence    = parseInt(get(row, 'cadence')) || 0;
  const elevation  = parseInt(get(row, 'elevation')) || 0;
  const vo         = parseNum(get(row, 'vo'));
  const gct        = parseInt(get(row, 'gct')) || 0;

  const rawDate   = get(row, 'date');
  const dateObj   = rawDate ? new Date(rawDate) : new Date();
  const dateDisplay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    + ' · ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });

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
      ? synthesizeSplits(distKm, avgPaceSec, avgHr || 150, cadence || 175)
      : [],
  };
}
