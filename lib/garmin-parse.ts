import Papa from 'papaparse';
import type { ParsedWorkout, Split } from '@/types';
import { paceToSec } from './utils';

/**
 * Normalise a column header key:
 * strip BOM, replace embedded newlines with space, trim, lowercase.
 * Garmin embeds unit labels as a second line in the header cell, e.g. "Distanz\nkm".
 */
function normaliseKey(k: string): string {
  return k.replace(/^﻿/u, '').replace(/\n/g, ' ').trim().toLowerCase();
}

function normaliseRow(raw: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[normaliseKey(k)] = (v ?? '').trim();
  }
  return out;
}

/**
 * Field → list of normalised column name substrings to try (DE + EN).
 * Matched with .includes() so partial keys work.
 */
const FIELDS: Record<string, string[]> = {
  distance:  ['distanz km', 'distanz', 'distance'],
  duration:  ['gesamtzeit', 'elapsed time', 'total time'],
  lapTime:   ['zeit'],
  avgPace:   ['ø pace min/km', 'ø pace', 'avg pace', 'average pace'],
  avgHr:     ['ø herzfrequenz', 'avg hr', 'avg heart rate'],
  maxHr:     ['maximale herzfrequenz', 'max hr'],
  elevation: ['anstieg gesamt', 'total ascent', 'elevation gain'],
  cadence:   ['ø schrittfrequenz (laufen)', 'avg run cadence', 'cadence'],
  gct:       ['ø bodenkontaktzeit', 'avg ground contact time'],
  vo:        ['ø vertikale bewegung', 'avg vertical oscillation'],
};

function get(row: Record<string, string>, field: string): string {
  const keys = Object.keys(row);
  for (const needle of FIELDS[field] ?? []) {
    const match = keys.find(k => k.includes(needle) || needle.includes(k));
    if (match) {
      const val = row[match];
      if (val && val !== '--' && val !== '0') return val;
    }
  }
  return '';
}

function parseNum(s: string): number {
  return parseFloat(s.replace(',', '.')) || 0;
}

function parsePace(raw: string): string {
  if (!raw || !raw.includes(':')) return '0:00';
  const [m, rest] = raw.split(':');
  const s = Math.round(parseFloat(rest));
  return `${parseInt(m)}:${String(s).padStart(2, '0')}`;
}

function parseDuration(raw: string): { seconds: number; display: string } {
  const clean = raw.split('.')[0]; // strip decimal seconds
  const parts  = clean.split(':').map(Number);
  const secs   = parts.length === 3
    ? parts[0] * 3600 + parts[1] * 60 + parts[2]
    : parts[0] * 60 + (parts[1] ?? 0);
  return {
    seconds: secs,
    display: `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`,
  };
}

export function parseGarminCSV(text: string, filename: string): ParsedWorkout | null {
  const result = Papa.parse<Record<string, string>>(text, {
    header:         true,
    skipEmptyLines: true,
  });

  const rows: Record<string, string>[] = result.data.map(normaliseRow);
  if (!rows.length) return null;

  // Summary row: first cell is "übersicht" (DE) or "summary" (EN) or it's the last row
  const summaryRow = rows.find(r => {
    const first = Object.values(r)[0]?.toLowerCase() ?? '';
    return first === 'übersicht' || first === 'summary' || first.startsWith('übersicht');
  }) ?? rows[rows.length - 1];

  // Lap rows: first cell is a plain integer
  const lapRows = rows.filter(r => /^\d+$/.test(Object.values(r)[0] ?? ''));

  // ── Overall metrics from summary row ──────────────────────────────────────
  const distKm     = parseNum(get(summaryRow, 'distance'));
  const { seconds, display } = parseDuration(get(summaryRow, 'duration') || '0:00');
  const avgPace    = parsePace(get(summaryRow, 'avgPace'));
  const avgPaceSec = paceToSec(avgPace) || (distKm > 0 && seconds > 0 ? Math.round(seconds / distKm) : 300);
  const avgHr      = parseInt(get(summaryRow, 'avgHr'))   || 0;
  const maxHr      = parseInt(get(summaryRow, 'maxHr'))   || 0;
  const cadence    = parseInt(get(summaryRow, 'cadence')) || 0;
  const elevation  = parseInt(get(summaryRow, 'elevation')) || 0;
  const vo         = parseNum(get(summaryRow, 'vo'));
  const gct        = parseInt(get(summaryRow, 'gct')) || 0;

  // ── Splits from lap rows ──────────────────────────────────────────────────
  const splits: Split[] = lapRows
    .filter(r => parseNum(get(r, 'distance')) >= 0.5) // skip micro laps
    .map((r, i) => {
      const lapPace    = parsePace(get(r, 'avgPace'));
      const lapPaceSec = paceToSec(lapPace) || avgPaceSec;
      const lapHr      = parseInt(get(r, 'avgHr'))   || avgHr;
      const lapCad     = parseInt(get(r, 'cadence')) || cadence;
      // paceFrac: 1.0 = at avg pace, <1 = slower
      const paceFrac   = avgPaceSec > 0
        ? Math.max(0.4, Math.min(1, avgPaceSec / lapPaceSec))
        : 0.8;
      return { km: i + 1, pace: lapPace, hr: lapHr, cadence: lapCad, paceFrac };
    });

  const dateObj     = new Date();
  const dateDisplay = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
    + ' · ' + dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });

  return {
    filename,
    type:                 'Run',
    date:                 dateDisplay,
    duration:             display,
    distance:             distKm,
    avgPace,
    avgHr,
    maxHr,
    avgCadence:           cadence,
    elevation,
    verticalOscillation:  vo,
    groundContactTime:    gct,
    splits,
  };
}
