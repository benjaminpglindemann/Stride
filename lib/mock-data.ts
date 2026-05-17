import type { Athlete, Week, Session, Prescription, PlannerRec, ParsedWorkout } from '@/types';

export const athlete: Athlete = {
  name: 'Mara Holm',
  initials: 'MH',
  sport: 'Running',
  goal: 'Sub-38 minute 10K by April 18, 2027',
  units: 'metric',
  plan: `Pfitzinger 18/55 base build, week 6 of 12.
Mon: rest or 8km recovery
Tue: VO2 / threshold intervals
Wed: 10–12km steady
Thu: rest or easy 6km
Fri: tempo 6–8km @ MP+10s
Sat: long run, building to 22km
Sun: easy 8–10km`,
};

function buildWeeks(): Week[] {
  const base: Omit<Week, 'label' | 'idx'>[] = [
    { km: 38.4, sessions: 4, avgHr: 142, avgCadence: 175, bestPace: '4:32', vo: 8.4, avgPace: '5:08' },
    { km: 42.1, sessions: 5, avgHr: 144, avgCadence: 176, bestPace: '4:28', vo: 8.2, avgPace: '5:04' },
    { km: 46.8, sessions: 5, avgHr: 145, avgCadence: 177, bestPace: '4:21', vo: 8.1, avgPace: '5:02' },
    { km: 51.3, sessions: 6, avgHr: 146, avgCadence: 178, bestPace: '4:18', vo: 8.0, avgPace: '4:58' },
    { km: 34.2, sessions: 4, avgHr: 138, avgCadence: 176, bestPace: '4:24', vo: 8.2, avgPace: '5:12' },
    { km: 49.6, sessions: 5, avgHr: 147, avgCadence: 179, bestPace: '4:12', vo: 7.9, avgPace: '4:55' },
    { km: 54.8, sessions: 6, avgHr: 148, avgCadence: 180, bestPace: '4:08', vo: 7.7, avgPace: '4:52' },
    { km: 41.2, sessions: 4, avgHr: 146, avgCadence: 180, bestPace: '4:11', vo: 7.8, avgPace: '4:54' },
  ];
  return base.map((w, i) => {
    const d = new Date('2026-05-11');
    d.setDate(d.getDate() - (7 - i) * 7);
    return {
      ...w,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      idx: i,
    };
  });
}

export const weeks: Week[] = buildWeeks();

export const sessionsThisWeek: Session[] = [
  { day: 'Mon', date: 'May 11', type: 'Recovery',  detail: '8km easy',           distance: 8.0,  pace: '5:32', hr: 132, cadence: 174 },
  { day: 'Tue', date: 'May 12', type: 'Threshold', detail: '6×1000m @ T-pace',   distance: 12.4, pace: '4:18', hr: 162, cadence: 184 },
  { day: 'Wed', date: 'May 13', type: 'Steady',    detail: '11km Z2',             distance: 11.0, pace: '4:58', hr: 145, cadence: 178 },
  { day: 'Thu', date: 'May 14', type: 'Rest',      detail: 'No session',          distance: 0,    pace: '–',    hr: 0,   cadence: 0   },
  { day: 'Fri', date: 'May 15', type: 'Tempo',     detail: '7km @ MP+10s',        distance: 9.8,  pace: '4:34', hr: 156, cadence: 181 },
];

export const todaysBrief = {
  text: `You're <em>5 weeks into a 12-week build</em>, currently 47km into a 50–55km week with one quality session and the long run still to come. Threshold work is landing — cadence is up 3spm vs. baseline, VO down 0.6cm, and HR at tempo pace has dropped 2bpm in the last fortnight. Goal pace (3:48/km) currently sits at the top of your aerobic ceiling, so the next four weeks of VO2 work matter more than mileage.`,
  generatedAt: '06:48',
};

export const todaysRx: Prescription = {
  type: 'VO2 intervals',
  tag: 'Quality · Z5',
  distance: '10–11km total',
  paceRange: '3:42–3:48/km',
  hrTarget: '172–178 bpm',
  focus: [
    "Warm up 3km easy + 4 strides. Don't skip strides — they've correlated with your fastest interval sets.",
    'Hit 5×1000m at goal-10K pace (3:46). Recovery 90s standing. If rep 4 drifts > 3:50, cut rep 5.',
    'Cadence floor 184 on the work intervals. You held 182 at threshold yesterday — push it up here, this is where you build it.',
  ],
};

export const plannerRec: PlannerRec = {
  type: 'Long run — progression',
  when: 'Tomorrow · Sat',
  distance: '20km',
  pace: '5:10 → 4:40/km',
  hr: 'Z2 → top Z3',
  focus: "Last 5km at marathon pace. After yesterday's tempo, expect first 8km to feel heavy — that's the desired stimulus, not a reason to back off pace later.",
};

export const sampleParsed: ParsedWorkout = {
  filename: 'activity_20260515_morning_run.csv',
  type: 'Tempo run',
  date: 'Today · 06:12',
  duration: '44:47',
  distance: 9.84,
  avgPace: '4:34',
  avgHr: 156,
  maxHr: 168,
  avgCadence: 181,
  elevation: 62,
  verticalOscillation: 7.8,
  groundContactTime: 248,
  splits: [
    { km: 1,    pace: '4:52', hr: 142, cadence: 176, paceFrac: 0.72 },
    { km: 2,    pace: '4:38', hr: 151, cadence: 180, paceFrac: 0.86 },
    { km: 3,    pace: '4:31', hr: 156, cadence: 182, paceFrac: 0.93 },
    { km: 4,    pace: '4:33', hr: 158, cadence: 182, paceFrac: 0.91 },
    { km: 5,    pace: '4:29', hr: 159, cadence: 183, paceFrac: 0.95 },
    { km: 6,    pace: '4:28', hr: 161, cadence: 183, paceFrac: 0.96 },
    { km: 7,    pace: '4:34', hr: 158, cadence: 181, paceFrac: 0.90 },
    { km: 8,    pace: '4:37', hr: 156, cadence: 180, paceFrac: 0.88 },
    { km: 9,    pace: '4:33', hr: 159, cadence: 181, paceFrac: 0.91 },
    { km: 9.84, pace: '4:48', hr: 154, cadence: 178, paceFrac: 0.78 },
  ],
};

export const initialAnalysis = `**Tempo run, 9.84km in 44:47 (avg 4:34/km, HR 156).**

You held pace targets cleanly through km 2–6 — splits between **4:28** and **4:33** with HR drifting from 151 to 161. That's textbook tempo work for a marathon-pace-plus-10s session: HR ramps gradually, cadence stable around **182**. The last 3km show a small fade: pace held but HR-to-pace efficiency dropped (HR 158–159 at slower paces than km 5).

Compared to your last two tempo sessions, average pace is **6 seconds faster per km** and HR is **2bpm lower** at the same effort. Cadence is **+3spm** vs. your 8-week baseline. The aerobic system is responding to the threshold work — your VO has dropped from 8.4 to 7.8cm over 5 weeks, which tracks with cleaner mechanics.

**Pay attention to:**
- The kilometer-7 transition. You're losing form there in 3 of the last 4 quality sessions — likely a fueling or focus thing, worth experimenting with.
- Cadence held through fatigue today. Keep that as the metric to defend when paces get hard.
- Stride efficiency at threshold pace is now clearly better than at marathon pace. Useful for the 10K — your goal pace (**3:48/km**) sits in the threshold zone you just nailed.`;
