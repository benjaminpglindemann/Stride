'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Athlete, Week, Session, Prescription, PlannerRec } from '@/types';
import Topbar from './topbar';
import Masthead from './masthead';
import Brief from './brief';
import Chart from './chart';
import UploadCard from './upload-card';
import PlannerCard from './planner-card';
import Colophon from './colophon';
import UploadDrawer from './upload-drawer';

interface Props {
  athlete: Athlete;
  weeks: Week[];
  sessionsThisWeek: Session[];
  briefText: string;
  hasWorkouts: boolean;
  rx: Prescription;
  plannerRec: PlannerRec;
}

export default function Dashboard({
  athlete,
  weeks,
  sessionsThisWeek,
  briefText,
  hasWorkouts,
  rx,
  plannerRec,
}: Props) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  const onSave = () => {
    setDrawerOpen(false);
    setSavedCount(c => c + 1);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3200);
    // Refresh server data after a brief delay to let the DB commit settle
    setTimeout(() => router.refresh(), 300);
  };

  const currentWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
  const now         = new Date();
  const weekNum     = Math.ceil((((now.getTime() - new Date(now.getFullYear(), 0, 1).getTime()) / 86400000) + 1) / 7);

  return (
    <div className="min-h-screen flex flex-col bg-paper">
      <Topbar athlete={athlete} />

      <main className="max-w-[1320px] mx-auto px-12 pb-24 w-full">

        <Masthead athlete={athlete} weeks={weeks} />

        <Brief initialText={briefText} hasWorkouts={hasWorkouts} rx={rx} />

        {/* Performance */}
        <section>
          <div className="flex items-baseline justify-between mt-14 mb-[18px] pb-3 border-b border-rule gap-4">
            <h2 className="font-serif text-[28px] text-ink">The week in numbers</h2>
            <span className="font-sans text-[12px] text-ink-3 tracking-[0.06em] uppercase">
              Week {weekNum} · {now.getFullYear()}{currentWeek ? ` · ${currentWeek.km.toFixed(1)}km this week` : ''}
            </span>
          </div>
          <Chart weeks={weeks} sessionsThisWeek={sessionsThisWeek} />
        </section>

        {/* Next moves */}
        <section>
          <div className="flex items-baseline justify-between mt-14 mb-[18px] pb-3 border-b border-rule gap-4">
            <h2 className="font-serif text-[28px] text-ink">Next moves</h2>
            <span className="font-sans text-[12px] text-ink-3 tracking-[0.06em] uppercase">
              Upload yesterday&apos;s run · plan tomorrow
            </span>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <UploadCard onClick={() => setDrawerOpen(true)} savedCount={savedCount} />
            <PlannerCard athlete={athlete} rec={plannerRec} weeks={weeks} />
          </div>
        </section>

        <Colophon />
      </main>

      {/* Upload drawer */}
      {drawerOpen && (
        <UploadDrawer
          athlete={athlete}
          weeks={weeks}
          onClose={() => setDrawerOpen(false)}
          onSave={onSave}
        />
      )}

      {/* Save toast */}
      {showToast && (
        <div
          className="fixed bottom-6 left-1/2 flex items-center gap-3.5 px-[22px] py-3.5 rounded-[6px] font-sans text-[13px] z-50 animate-toast-up"
          style={{ background: 'var(--ink)', color: 'var(--paper)', boxShadow: '0 12px 36px rgba(22,20,16,0.32)', transform: 'translateX(-50%)' }}
        >
          <div className="flex gap-[3px] shrink-0">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-[3px] h-6 bg-accent rounded-full" />
            ))}
          </div>
          <div>
            <strong className="font-semibold">Workout saved.</strong>
            <span style={{ opacity: 0.7 }}> Chart updated. Transcript filed under Workout History.</span>
          </div>
        </div>
      )}
    </div>
  );
}
