'use client';

interface Props {
  onClick: () => void;
  savedCount: number;
}

export default function UploadCard({ onClick, savedCount }: Props) {
  return (
    <div
      className="bg-paper border border-rule rounded-lg p-7 flex flex-col relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, rgba(247,244,237,0) 0%, rgba(239,235,224,0.55) 100%), var(--paper)' }}
    >
      <span className="font-sans text-[10.5px] tracking-[0.16em] uppercase text-accent mb-3">
        Upload workout
      </span>
      <h3 className="font-serif text-[26px] italic text-ink mb-[10px]">
        Bring yesterday&apos;s run in.
      </h3>
      <p className="text-ink-3 text-[14px] leading-[1.5] mb-5 text-pretty max-w-[70ch]">
        Drop a Garmin CSV (or FIT, TCX) and we&apos;ll parse it on-device, then open the coach for a session-by-session breakdown.
        {savedCount > 0 && (
          <> · <strong className="text-ink font-semibold">{savedCount} saved this session</strong></>
        )}
      </p>

      <button
        onClick={onClick}
        className="group flex border-[1.5px] border-dashed border-rule rounded-lg px-7 py-6 items-center justify-between gap-5 bg-paper-2 transition-all duration-150 cursor-pointer hover:border-accent hover:bg-accent-soft w-full text-left font-sans"
      >
        <div className="flex flex-col gap-1">
          <strong className="font-sans text-[14px] text-ink">Drop file or browse</strong>
          <span className="font-mono text-[12px] text-ink-3">.csv · .fit · .tcx</span>
        </div>
        <div className="w-[38px] h-[38px] rounded-full bg-ink text-paper flex items-center justify-center text-[18px] shrink-0 transition-colors duration-150 group-hover:bg-accent">
          →
        </div>
      </button>
    </div>
  );
}
