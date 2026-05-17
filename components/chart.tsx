'use client';

import { useState, useMemo, useRef } from 'react';
import type { Week, Session } from '@/types';
import { paceToSec } from '@/lib/utils';

const METRICS = {
  km:         { label: 'Distance',   unit: 'km',  fmt: (v: number) => v.toFixed(1) },
  avgCadence: { label: 'Cadence',    unit: 'spm', fmt: (v: number) => Math.round(v).toString() },
  avgPace:    { label: 'Avg pace',   unit: '/km', fmt: (v: number) => { const m = Math.floor(v / 60); return `${m}:${String(Math.round(v % 60)).padStart(2,'0')}`; } },
  avgHr:      { label: 'Avg HR',     unit: 'bpm', fmt: (v: number) => Math.round(v).toString() },
  vo:         { label: 'Vert. osc.', unit: 'cm',  fmt: (v: number) => v.toFixed(1) },
} as const;

type MetricKey = keyof typeof METRICS;

const RANGES = [
  { id: '4w',  label: '4w',  weeks: 4 },
  { id: '8w',  label: '8w',  weeks: 8 },
  { id: '12w', label: '12w', weeks: 12 },
  { id: 'all', label: 'All', weeks: 999 },
] as const;

type RangeId = typeof RANGES[number]['id'];

interface Props {
  weeks: Week[];
  sessionsThisWeek: Session[];
}

const W = 1000, H = 360;
const padL = 48, padR = 24, padT = 28, padB = 44;
const plotW = W - padL - padR;
const plotH = H - padT - padB;

function synthesizeSessions(week: Week): Session[] {
  const types = [
    { type: 'Recovery',  detail: 'Z2 easy',       mult: 0.18, paceDelta: 35,  hrDelta: -10, cadDelta: -3 },
    { type: 'Threshold', detail: 'Intervals',      mult: 0.28, paceDelta: -25, hrDelta: 14,  cadDelta: 5  },
    { type: 'Steady',    detail: 'Z2 base',        mult: 0.24, paceDelta: 0,   hrDelta: 0,   cadDelta: 0  },
    { type: 'Tempo',     detail: 'MP+10s',         mult: 0.18, paceDelta: -15, hrDelta: 8,   cadDelta: 3  },
    { type: 'Long',      detail: 'Progressive',    mult: 0.36, paceDelta: 8,   hrDelta: 2,   cadDelta: -1 },
  ];
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const out: Session[] = [];
  let i = 0;
  for (const t of types) {
    if (out.length >= week.sessions) break;
    const dist = week.km * t.mult;
    const base = paceToSec(week.avgPace) + t.paceDelta;
    const m = Math.floor(base / 60);
    const s = Math.round(base % 60);
    out.push({
      day: days[i++],
      type: t.type,
      detail: t.detail,
      distance: dist,
      pace: `${m}:${String(s).padStart(2,'0')}`,
      hr: week.avgHr + t.hrDelta,
      cadence: week.avgCadence + t.cadDelta,
    });
  }
  return out;
}

export default function Chart({ weeks, sessionsThisWeek }: Props) {
  const [metric, setMetric] = useState<MetricKey>('km');
  const [rangeId, setRangeId] = useState<RangeId>('8w');
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const range = RANGES.find(r => r.id === rangeId)!;
  const data = useMemo(() => weeks.slice(-Math.min(range.weeks, weeks.length)), [weeks, range]);

  // Bar (distance) scale
  const bars = data.map(w => w.km);
  const barMax = Math.ceil(Math.max(...bars) / 10) * 10 + 10;
  const barX = (i: number) => padL + (plotW / data.length) * (i + 0.5);
  const barW = Math.min(46, (plotW / data.length) * 0.6);
  const barY = (v: number) => padT + plotH - (v / barMax) * plotH;

  // Line (overlay) scale
  const lineKey: MetricKey = metric === 'km' ? 'avgCadence' : metric;
  const lineRaw = data.map(w => {
    if (lineKey === 'avgPace') return paceToSec(w.avgPace);
    return w[lineKey] as number;
  });
  const lineMin = Math.min(...lineRaw);
  const lineMax = Math.max(...lineRaw);
  const linePad = (lineMax - lineMin) * 0.3 || 1;
  const lineYMin = lineMin - linePad;
  const lineYMax = lineMax + linePad;
  const lineY = (v: number) => padT + plotH - ((v - lineYMin) / (lineYMax - lineYMin)) * plotH;

  const linePath = data.map((w, i) => `${i === 0 ? 'M' : 'L'} ${barX(i).toFixed(1)} ${lineY(lineRaw[i]).toFixed(1)}`).join(' ');
  const lineFillPath = `${linePath} L ${barX(data.length - 1).toFixed(1)} ${padT + plotH} L ${barX(0).toFixed(1)} ${padT + plotH} Z`;

  const gridlines = Array.from({ length: 5 }, (_, i) => ({
    v: (barMax / 4) * i,
    y: barY((barMax / 4) * i),
  }));

  const activeIdx = hoverIdx ?? pinnedIdx;
  const activeWeek = activeIdx != null ? data[activeIdx] : null;
  const isBarMetric = metric === 'km';
  const xStep = data.length > 10 ? 2 : 1;

  // Tooltip position
  let tipStyle: React.CSSProperties = {};
  if (activeIdx != null && wrapRef.current) {
    const rect = wrapRef.current.getBoundingClientRect();
    const xRatio = barX(activeIdx) / W;
    const yRatio = (barY(bars[activeIdx]) - 12) / H;
    const left = xRatio * rect.width;
    const top = yRatio * rect.height;
    const flipLeft = xRatio > 0.7;
    tipStyle = {
      left:  flipLeft ? 'auto' : left + 14,
      right: flipLeft ? (1 - xRatio) * rect.width + 14 : 'auto',
      top:   Math.max(10, top - 60),
    };
  }

  const onBarClick = (i: number) => setPinnedIdx(p => p === i ? null : i);

  return (
    <div className="flex flex-col gap-[18px]">

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">

        {/* Metric toggle */}
        <div className="flex border border-rule rounded-full p-[3px] bg-paper gap-[2px]" role="tablist">
          {(Object.entries(METRICS) as [MetricKey, typeof METRICS[MetricKey]][]).map(([k, m]) => (
            <button
              key={k}
              role="tab"
              onClick={() => setMetric(k)}
              className={[
                'px-3.5 py-1.5 font-sans text-[12px] rounded-full cursor-pointer border-0 transition-colors duration-150 tracking-[0.02em]',
                metric === k ? 'bg-ink text-paper' : 'bg-transparent text-ink-3 hover:text-ink',
              ].join(' ')}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Range toggle */}
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r.id}
              onClick={() => { setRangeId(r.id); setPinnedIdx(null); setHoverIdx(null); }}
              className={[
                'bg-transparent border-0 px-[10px] py-1.5 font-mono text-[12px] cursor-pointer tracking-[0.02em]',
                rangeId === r.id
                  ? 'text-ink border-b border-accent rounded-none'
                  : 'text-ink-4 hover:text-ink-2',
              ].join(' ')}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="relative pt-2" ref={wrapRef}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="block w-full h-auto"
          onMouseLeave={() => setHoverIdx(null)}
        >
          {/* Gridlines */}
          {gridlines.map((g, i) => (
            <g key={i}>
              <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="var(--rule-soft)" strokeWidth="1" />
              {isBarMetric && (
                <text x={padL - 10} y={g.y + 4} fontSize="11" textAnchor="end" fill="var(--ink-4)" fontFamily="var(--font-mono, monospace)">
                  {Math.round(g.v)}
                </text>
              )}
            </g>
          ))}

          {/* Bottom axis rule */}
          <line x1={padL} x2={W - padR} y1={padT + plotH} y2={padT + plotH} stroke="var(--ink-3)" strokeWidth="1" />

          {/* Bars */}
          {data.map((w, i) => {
            const x = barX(i) - barW / 2;
            const y = barY(w.km);
            const h = padT + plotH - y;
            const isActive = activeIdx === i;
            const isLast = i === data.length - 1;
            return (
              <g
                key={i}
                onMouseEnter={() => setHoverIdx(i)}
                onClick={() => onBarClick(i)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x={x} y={y} width={barW} height={h}
                  fill={isActive ? 'var(--accent)' : isLast ? 'var(--ink-2)' : 'var(--ink)'}
                  opacity={isBarMetric ? (isActive ? 1 : 0.92) : (isActive ? 0.6 : 0.18)}
                  style={{ transition: 'fill 0.15s ease, opacity 0.15s ease' }}
                />
                {/* Full-column hit area */}
                <rect
                  x={barX(i) - (plotW / data.length) / 2}
                  y={padT}
                  width={plotW / data.length}
                  height={plotH}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* Line overlay — non-km metrics */}
          {!isBarMetric && (
            <>
              <path d={lineFillPath} fill="var(--accent)" opacity="0.06" />
              <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="1.5" />
              {data.map((_, i) => (
                <circle
                  key={i}
                  cx={barX(i)} cy={lineY(lineRaw[i])}
                  r={activeIdx === i ? 5 : 3}
                  fill={activeIdx === i ? 'var(--accent)' : 'var(--paper)'}
                  stroke="var(--accent)" strokeWidth="1.5"
                />
              ))}
            </>
          )}

          {/* Cadence overlay — km metric */}
          {isBarMetric && (
            <>
              <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth="1.25" opacity="0.7" strokeDasharray="2 3" />
              {data.map((_, i) => (
                <circle key={i} cx={barX(i)} cy={lineY(lineRaw[i])} r={2.5} fill="var(--accent)" opacity="0.8" />
              ))}
            </>
          )}

          {/* X-axis labels */}
          {data.map((w, i) => {
            if (i % xStep !== 0 && i !== data.length - 1) return null;
            return (
              <text key={i} x={barX(i)} y={H - 18} fontSize="11" textAnchor="middle" fill="var(--ink-4)" fontFamily="var(--font-sans, sans-serif)">
                {w.label}
              </text>
            );
          })}

          {/* Axis captions */}
          <text x={padL} y={padT - 8} fontSize="10.5" fill="var(--ink-4)" fontFamily="var(--font-sans, sans-serif)" letterSpacing="1.4">
            {isBarMetric ? 'KILOMETRES PER WEEK' : METRICS[metric].label.toUpperCase()}
          </text>
          <text x={W - padR} y={padT - 8} fontSize="10.5" textAnchor="end" fill="var(--ink-4)" fontFamily="var(--font-sans, sans-serif)" letterSpacing="1.4">
            {(isBarMetric ? 'CADENCE OVERLAY · spm' : `${METRICS[lineKey].label} · ${METRICS[lineKey].unit}`).toUpperCase()}
          </text>
        </svg>

        {/* Tooltip */}
        {activeWeek && (
          <div
            className="absolute pointer-events-none min-w-[200px] rounded-[6px] text-[12px] font-sans z-10"
            style={{ ...tipStyle, background: 'var(--ink)', color: 'var(--paper)', padding: '12px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.18)' }}
          >
            <h5 className="font-serif italic text-[14px] font-normal m-0 mb-2 pb-1.5 border-b border-white/20">
              Week of {activeWeek.label}
            </h5>
            {[
              ['Distance',     `${activeWeek.km.toFixed(1)} km`],
              ['Sessions',     String(activeWeek.sessions)],
              ['Avg HR',       `${activeWeek.avgHr} bpm`],
              ['Avg cadence',  `${activeWeek.avgCadence} spm`],
              ['Best pace',    `${activeWeek.bestPace}/km`],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between text-[11.5px] leading-[1.7]">
                <span style={{ opacity: 0.55 }}>{label}</span>
                <span className="font-mono tabular-nums">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session breakdown */}
      {pinnedIdx != null && (
        <SessionBreakdown
          week={data[pinnedIdx]}
          sessions={pinnedIdx === data.length - 1 ? sessionsThisWeek : null}
          onClose={() => setPinnedIdx(null)}
        />
      )}
    </div>
  );
}

function SessionBreakdown({
  week, sessions, onClose,
}: {
  week: Week;
  sessions: Session[] | null;
  onClose: () => void;
}) {
  const list = sessions ?? synthesizeSessions(week);
  return (
    <div className="mt-6 border-t border-rule pt-[18px] flex flex-col">
      <div className="flex justify-between items-baseline mb-3">
        <h4 className="font-serif text-[17px] italic text-ink">
          Week of {week.label} · {week.km.toFixed(1)} km across {week.sessions} sessions
        </h4>
        <button onClick={onClose} className="bg-transparent border-0 text-[18px] text-ink-4 hover:text-accent px-2 py-1 cursor-pointer" aria-label="Close">
          ×
        </button>
      </div>

      {/* Header row */}
      <div className="grid [grid-template-columns:60px_1.2fr_70px_70px_70px_70px_24px] gap-4 pb-2 font-sans text-[10px] tracking-[0.14em] uppercase text-ink-4">
        <span>Day</span><span>Session</span><span>Dist</span><span>Pace</span><span>HR</span><span>Cad</span><span />
      </div>

      {list.map((s, i) => (
        <div key={i} className="grid [grid-template-columns:60px_1.2fr_70px_70px_70px_70px_24px] gap-4 py-3 items-center border-t border-rule-soft font-sans text-[13px]">
          <span className="font-serif italic text-ink">{s.day}</span>
          <span className="text-ink">
            {s.type}
            <small className="text-ink-4 text-[11px] ml-2">{s.detail}</small>
          </span>
          <span className="font-mono tabular-nums text-ink-2">{s.distance ? s.distance.toFixed(1) : '–'}</span>
          <span className="font-mono tabular-nums text-ink-2">{s.pace}</span>
          <span className="font-mono tabular-nums text-ink-2">{s.hr || '–'}</span>
          <span className="font-mono tabular-nums text-ink-2">{s.cadence || '–'}</span>
          <span className="text-ink-4 text-right">›</span>
        </div>
      ))}
    </div>
  );
}
