'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sparkline from './sparkline';
import Topbar from '@/components/topbar';
import type { Athlete } from '@/types';

interface WorkoutRow {
  id: string;
  startedAt: string;
  type: string;
  distance: number;
  duration: string;
  avgPace: string;
  avgPaceSec: number;
  avgHr: number;
  maxHr: number;
  avgCadence: number;
  verticalOscillation: number;
  elevation: number;
  paceNums: number[];
  excerpt: string;
}

const TYPES = ['Recovery', 'Steady', 'Tempo', 'Threshold', 'Intervals', 'Long'];

export default function HistoryList() {
  const router = useRouter();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading]   = useState(true);
  const [athlete, setAthlete]   = useState<Athlete | null>(null);

  const [typeFilter, setTypeFilter] = useState('All');
  const [distFilter, setDistFilter] = useState('any');
  const [dateFilter, setDateFilter] = useState('all');
  const [sortBy,     setSortBy]     = useState<'date'|'distance'|'pace'|'hr'>('date');
  const [sortDir,    setSortDir]    = useState<'asc'|'desc'>('desc');

  useEffect(() => {
    Promise.all([
      fetch('/api/workouts/list', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/athlete/me',    { credentials: 'include' }).then(r => r.json()).catch(() => null),
    ]).then(([ws, ath]) => {
      setWorkouts(Array.isArray(ws) ? ws : []);
      if (ath?.name) setAthlete(ath);
      setLoading(false);
    });
  }, []);

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = { All: workouts.length };
    TYPES.forEach(t => { m[t] = workouts.filter(w => w.type === t).length; });
    return m;
  }, [workouts]);

  const filtered = useMemo(() => {
    const now = Date.now();
    let list = workouts.slice();
    if (typeFilter !== 'All') list = list.filter(w => w.type === typeFilter);
    if (distFilter === 'sub10')   list = list.filter(w => w.distance < 10);
    if (distFilter === '10to15')  list = list.filter(w => w.distance >= 10 && w.distance < 15);
    if (distFilter === '15plus')  list = list.filter(w => w.distance >= 15);
    if (dateFilter !== 'all') {
      const wks = dateFilter === '4w' ? 4 : 8;
      const cutoff = now - wks * 7 * 86400000;
      list = list.filter(w => new Date(w.startedAt).getTime() >= cutoff);
    }
    list.sort((a, b) => {
      const av = sortBy === 'date' ? new Date(a.startedAt).getTime()
               : sortBy === 'distance' ? a.distance
               : sortBy === 'pace'     ? a.avgPaceSec
               : a.avgHr;
      const bv = sortBy === 'date' ? new Date(b.startedAt).getTime()
               : sortBy === 'distance' ? b.distance
               : sortBy === 'pace'     ? b.avgPaceSec
               : b.avgHr;
      return sortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [workouts, typeFilter, distFilter, dateFilter, sortBy, sortDir]);

  const totalKm   = filtered.reduce((s, w) => s + w.distance, 0);

  const toggleSort = (key: typeof sortBy) => {
    if (sortBy === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(key); setSortDir('desc'); }
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return {
      day:  d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    };
  };

  const placeholderAthlete: Athlete = {
    name: 'Athlete', initials: 'A', sport: 'running', goal: '', units: 'metric', plan: '',
  };

  return (
    <div className="min-h-screen bg-paper flex flex-col">
      <Topbar athlete={athlete ?? placeholderAthlete} activePage="Workout history" />

      <main className="max-w-[1320px] mx-auto px-12 pb-24 w-full">
        {/* Masthead */}
        <div className="pt-9 pb-7 border-b border-rule flex items-end justify-between gap-8">
          <div>
            <div className="font-sans text-[12px] text-ink-3 tracking-[0.06em] uppercase flex items-center gap-[18px]">
              <span>The archive</span>
              <span className="inline-block w-[3px] h-[3px] rounded-full bg-ink-4" />
              <span>Every session, every transcript, indexed</span>
            </div>
            <h1 className="font-serif text-[64px] leading-[0.98] tracking-[-0.022em] mt-3.5 text-ink">
              Workout <em className="italic text-accent">history.</em>
            </h1>
          </div>
          <div className="font-sans text-[13px] text-ink-3 text-right flex flex-col gap-[6px] shrink-0">
            <span><strong className="text-ink font-semibold">{filtered.length}</strong> of {workouts.length} sessions</span>
            <span><strong className="text-ink font-semibold">{totalKm.toFixed(1)}km</strong> in view</span>
            <span>Filter, sort, jump in</span>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-6 flex justify-between gap-8 flex-wrap">
          <div className="flex flex-col gap-2">
            <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">Type</span>
            <div className="flex gap-1.5 flex-wrap">
              {(['All', ...TYPES] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={[
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-full border font-sans text-[12px] cursor-pointer transition-all duration-150',
                    typeFilter === t ? 'bg-ink text-paper border-ink' : 'bg-transparent text-ink-2 border-rule hover:border-ink-3',
                  ].join(' ')}
                >
                  {t}
                  {typeCounts[t] !== undefined && (
                    <small className="font-mono text-[10px] opacity-60">{typeCounts[t]}</small>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-2">
              <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">Period</span>
              <div className="flex gap-1.5">
                {[['all','All time'],['8w','Last 8w'],['4w','Last 4w']] as const as [string,string][]}
                {[['all','All time'],['8w','Last 8w'],['4w','Last 4w']].map(([k,l]) => (
                  <button key={k} onClick={() => setDateFilter(k)}
                    className={['px-3 py-1.5 rounded-full border font-sans text-[12px] cursor-pointer transition-all duration-150', dateFilter === k ? 'bg-ink text-paper border-ink' : 'text-ink-2 border-rule hover:border-ink-3'].join(' ')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">Distance</span>
              <div className="flex gap-1.5">
                {[['any','Any'],['sub10','< 10km'],['10to15','10–15km'],['15plus','15km+']].map(([k,l]) => (
                  <button key={k} onClick={() => setDistFilter(k)}
                    className={['px-3 py-1.5 rounded-full border font-sans text-[12px] cursor-pointer transition-all duration-150', distFilter === k ? 'bg-ink text-paper border-ink' : 'text-ink-2 border-rule hover:border-ink-3'].join(' ')}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="mt-8">
          {/* Header */}
          <div className="grid [grid-template-columns:100px_1fr_80px_80px_60px_60px_130px_24px] gap-4 pb-2 border-b border-rule font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">
            <SortBtn label="Date"     active={sortBy==='date'}     dir={sortDir} onClick={() => toggleSort('date')} />
            <span>Session</span>
            <SortBtn label="Distance" active={sortBy==='distance'} dir={sortDir} onClick={() => toggleSort('distance')} />
            <SortBtn label="Pace"     active={sortBy==='pace'}     dir={sortDir} onClick={() => toggleSort('pace')} />
            <SortBtn label="HR"       active={sortBy==='hr'}       dir={sortDir} onClick={() => toggleSort('hr')} />
            <span>Cad</span>
            <span>Pace shape</span>
            <span />
          </div>

          {loading && (
            <div className="py-20 text-center font-serif italic text-[18px] text-ink-3">Loading…</div>
          )}

          {!loading && filtered.length === 0 && (
            <div className="py-20 text-center">
              <p className="font-serif italic text-[22px] text-ink-3">No sessions yet.</p>
              <p className="font-sans text-[13px] text-ink-4 mt-2">
                {workouts.length === 0
                  ? 'Upload your first workout from the dashboard.'
                  : 'No sessions match these filters.'}
              </p>
            </div>
          )}

          {filtered.map(w => {
            const { day, date } = fmtDate(w.startedAt);
            return (
              <button
                key={w.id}
                onClick={() => router.push(`/workout-history/${w.id}`)}
                className="w-full text-left grid [grid-template-columns:100px_1fr_80px_80px_60px_60px_130px_24px] gap-4 py-3 border-t border-rule-soft hover:bg-paper-2 transition-colors duration-100 cursor-pointer group"
              >
                <div className="flex flex-col">
                  <span className="font-serif italic text-[13px] text-ink">{day}</span>
                  <span className="font-mono text-[11px] text-ink-4 tabular-nums">{date}</span>
                </div>
                <div className="flex flex-col justify-center">
                  <span className="font-serif italic text-[14px] text-ink">{w.type}</span>
                  <span className="font-mono text-[11px] text-ink-4 uppercase tracking-[0.08em]">{w.duration}</span>
                </div>
                <span className="font-mono text-[13px] text-ink tabular-nums self-center">
                  {w.distance.toFixed(1)}<small className="text-[10px] text-ink-3 ml-0.5">km</small>
                </span>
                <span className="font-mono text-[13px] text-ink-2 tabular-nums self-center">{w.avgPace}</span>
                <span className="font-mono text-[13px] text-ink-2 tabular-nums self-center">{w.avgHr || '–'}</span>
                <span className="font-mono text-[13px] text-ink-2 tabular-nums self-center">{w.avgCadence || '–'}</span>
                <div className="self-center">
                  <Sparkline paceNums={w.paceNums} />
                </div>
                <span className="font-sans text-[16px] text-ink-4 group-hover:text-accent self-center transition-colors">›</span>

                {/* Excerpt row */}
                {w.excerpt && (
                  <div className="col-span-8 font-serif italic text-[13px] text-ink-3 -mt-1 pb-1 leading-[1.4] text-pretty" style={{ gridColumn: '2 / 8' }}>
                    {w.excerpt.slice(0, 120)}{w.excerpt.length > 120 ? '…' : ''}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function SortBtn({ label, active, dir, onClick }: {
  label: string; active: boolean; dir: 'asc'|'desc'; onClick: () => void;
}) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 cursor-pointer hover:text-ink transition-colors">
      {label}
      {active && <span className="text-accent">{dir === 'asc' ? '↑' : '↓'}</span>}
    </button>
  );
}
