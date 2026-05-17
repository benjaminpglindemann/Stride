import type { Athlete, Week } from '@/types';
import { greeting, daysOut } from '@/lib/utils';

export default function Masthead({ athlete, weeks }: { athlete: Athlete; weeks: Week[] }) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
  const thisWeek = weeks[weeks.length - 1];
  const lastWeek = weeks[weeks.length - 2];
  const diff = thisWeek.km - lastWeek.km;
  const firstName = athlete.name.split(' ')[0];

  return (
    <div className="pt-9 pb-7 border-b border-rule flex items-end justify-between gap-8">

      {/* Left */}
      <div>
        <div className="font-sans text-[12px] text-ink-3 tracking-[0.06em] uppercase flex items-center gap-[18px]">
          <span>{dateStr}</span>
          <span className="inline-block w-[3px] h-[3px] rounded-full bg-ink-4" />
          <span>Day 47 / 84 — Sub-38 10K · {daysOut(athlete.goal.match(/\w+ \d+, \d{4}/)?.[0] ?? '2027-04-18')}</span>
        </div>
        <h1 className="font-serif text-[64px] leading-[0.98] tracking-[-0.022em] mt-3.5 text-ink">
          {greeting()}, <em className="italic text-accent">{firstName}.</em>
        </h1>
      </div>

      {/* Right */}
      <div className="font-sans text-[13px] text-ink-3 text-right flex flex-col gap-[6px] shrink-0">
        <span>
          This week so far ·{' '}
          <strong className="text-ink font-semibold">{thisWeek.km.toFixed(1)}km</strong>
        </span>
        <span>
          {diff > 0 ? `+${diff.toFixed(1)}km` : `${diff.toFixed(1)}km`} vs. last · {thisWeek.sessions} sessions
        </span>
        <span>
          Resting HR <strong className="text-ink font-semibold">48</strong> bpm · sleep{' '}
          <strong className="text-ink font-semibold">7h 12m</strong>
        </span>
      </div>

    </div>
  );
}
