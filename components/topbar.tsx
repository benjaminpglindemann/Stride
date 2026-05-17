import type { Athlete } from '@/types';

export default function Topbar({ athlete }: { athlete: Athlete }) {
  return (
    <header
      className="sticky top-0 z-50 border-b border-rule"
      style={{ background: 'rgba(247,244,237,0.88)', backdropFilter: 'saturate(160%) blur(8px)', WebkitBackdropFilter: 'saturate(160%) blur(8px)' }}
    >
      <div className="max-w-[1320px] mx-auto px-12 py-3.5 flex items-center justify-between gap-6">

        {/* Brand */}
        <div className="flex items-baseline gap-[10px] font-serif text-[22px] tracking-[-0.015em] text-ink select-none">
          <span className="inline-block w-[6px] h-[6px] rounded-full bg-accent translate-y-[-3px]" />
          Stride <span className="italic">&amp;</span> Signal
          <small className="font-sans text-[10.5px] tracking-[0.14em] uppercase text-ink-3 ml-2 pl-3 border-l border-rule not-italic">
            The Coach&apos;s Brief · Vol IV
          </small>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-7">
          {(['Dashboard', 'Workout history', 'Plan', 'Profile'] as const).map((label) => (
            <a
              key={label}
              href="#"
              className={[
                'font-sans text-[13px] no-underline tracking-[0.01em] transition-colors duration-150',
                label === 'Dashboard' ? 'text-ink' : 'text-ink-3 hover:text-accent',
              ].join(' ')}
            >
              {label}
            </a>
          ))}
        </nav>

        {/* User chip */}
        <div className="flex items-center gap-[10px] pl-[6px] pr-[10px] py-[6px] border border-rule rounded-full font-sans text-[12.5px] text-ink">
          <span className="w-[26px] h-[26px] rounded-full bg-ink text-paper flex items-center justify-center font-serif text-[13px] select-none">
            {athlete.initials}
          </span>
          <span>{athlete.name.split(' ')[0]}</span>
        </div>

      </div>
    </header>
  );
}
