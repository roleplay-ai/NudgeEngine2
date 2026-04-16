'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import AttendanceConfirm from '@/components/participant/AttendanceConfirm';
import {
  isBeforeTrainingDay,
  isTrainingDayToday,
  isAfterTrainingDay,
} from '@/lib/date-training';

interface Cohort {
  id: string;
  name: string;
  training_date: string;
  training_time: string | null;
  location: string | null;
  cohort_phases?: { id: string; name: string; sequence_order: number }[];
  programmes?: { name: string } | null;
}

export default function TrainingDayPage() {
  const [cohort, setCohort] = useState<Cohort | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<{
    pre_confirmed: boolean;
    live_checkin: boolean;
  } | null>(null);
  const [commitment, setCommitment] = useState<{ main_commitment: string } | null>(null);
  const [actionCount, setActionCount] = useState(0);

  const load = useCallback(async () => {
    const cRes = await fetch('/api/participant/cohort');
    if (!cRes.ok) return;
    const cData = await cRes.json();
    if (!cData.cohort) {
      setCohort(null);
      setLoading(false);
      return;
    }

    const ch = cData.cohort as Cohort;
    setCohort(ch);

    const aRes = await fetch(`/api/attendance?cohort_id=${ch.id}`);
    if (aRes.ok) {
      const aData = await aRes.json();
      setAttendance(aData.attendance);
    }

    const cmRes = await fetch(`/api/commitments?cohort_id=${ch.id}`);
    if (cmRes.ok) {
      const cmData = await cmRes.json();
      setCommitment(cmData.commitment_plan);
      setActionCount((cmData.actions ?? []).length);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <>
        <Topbar title="Training Day" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="card py-12 text-center text-text-muted">Loading…</div>
        </main>
      </>
    );
  }

  if (!cohort) {
    return (
      <>
        <Topbar title="Training Day" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="card py-16 text-center max-w-md mx-auto">
            <p className="text-3xl mb-4">📅</p>
            <p className="font-bold text-brand-dark text-lg mb-2">No active cohort</p>
            <p className="text-text-muted text-sm">Once HR enrols you in a programme, your training day details will appear here.</p>
          </div>
        </main>
      </>
    );
  }

  const td = cohort.training_date;
  const before = isBeforeTrainingDay(td);
  const today = isTrainingDayToday(td);
  const after = isAfterTrainingDay(td);

  const phases = [...(cohort.cohort_phases ?? [])].sort((a, b) => a.sequence_order - b.sequence_order);

  const att = attendance ?? { pre_confirmed: false, live_checkin: false };

  const showAgenda =
    phases.length > 0 &&
    (today || after) &&
    (att.live_checkin || after);

  const showDone = !!(commitment && actionCount > 0);
  const needsActions = !!(commitment && actionCount === 0);

  return (
    <>
      <Topbar title="Training Day" />
      <main className="flex-1 overflow-y-auto px-7 py-6 max-w-3xl">
        {before && (
          <div
            className="rounded-xl px-4 py-3 mb-6 text-sm font-semibold"
            style={{ background: 'rgba(34,29,35,0.06)', color: '#221D23' }}
          >
            Training coming up — complete your pre-training checklist first for the best experience.
          </div>
        )}

        {today && (
          <div
            className="rounded-[20px] p-6 mb-6 text-center relative overflow-hidden animate-pulse"
            style={{ background: 'linear-gradient(135deg, #221D23 0%, #2E2433 100%)' }}
          >
            <div className="relative z-10">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-brand-yellow mb-1">
                Today
              </p>
              <h1 className="text-xl font-black text-white">TODAY IS TRAINING DAY</h1>
              <p className="text-xs text-white/60 mt-2">{cohort.name}</p>
            </div>
          </div>
        )}

        {after && !today && (
          <div className="section-label mb-2">SESSION COMPLETE</div>
        )}

        <h2 className="section-title text-lg mb-1">{cohort.name}</h2>
        <p className="text-sm text-text-muted mb-6">
          {cohort.programmes?.name ?? 'Programme'} ·{' '}
          {new Date(td).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          {cohort.training_time && ` · ${cohort.training_time}`}
          {cohort.location && ` · ${cohort.location}`}
        </p>

        <div className="mb-6">
          <AttendanceConfirm
            cohortId={cohort.id}
            preConfirmed={att.pre_confirmed}
            liveCheckin={att.live_checkin}
            isTrainingDay={today}
            onUpdate={load}
          />
        </div>

        {needsActions && (
          <div className="card mb-6" style={{ background: '#FFF9E6', border: '1px solid rgba(255,206,0,0.35)' }}>
            <p className="text-sm text-brand-dark font-semibold mb-2">Next step: choose your actions</p>
            <p className="text-xs text-text-muted mb-3">You&apos;ve saved your commitment — add concrete actions from the library.</p>
            <Link href="/participant/training-day/actions" className="btn-primary w-full justify-center inline-flex">
              Choose actions →
            </Link>
          </div>
        )}

        {showAgenda && (
          <div className="card mb-6" style={{ marginBottom: 16 }}>
            <div className="section-label mb-3">SESSION AGENDA</div>
            <div className="space-y-2">
              {phases.map((ph, i) => (
                <div
                  key={ph.id}
                  className="flex items-center gap-3 py-2 border-b last:border-0"
                  style={{ borderColor: 'rgba(34,29,35,0.06)' }}
                >
                  <span className="text-xs font-bold text-brand-dark w-6">{i + 1}</span>
                  <span className="text-sm font-semibold text-brand-dark">{ph.name}</span>
                </div>
              ))}
            </div>
            {!commitment && (
              <Link href="/participant/training-day/commitment" className="btn-primary w-full justify-center mt-4 inline-flex">
                Go to Commitment →
              </Link>
            )}
          </div>
        )}

        {showDone && commitment && (
          <div className="card" style={{ background: '#FAFFF7', border: '1px solid rgba(35,206,104,0.2)' }}>
            <div className="section-label mb-2">YOUR COMMITMENT</div>
            <p className="text-sm text-text-secondary leading-relaxed mb-4">{commitment.main_commitment}</p>
            <div className="text-xs text-text-muted mb-4">
              {actionCount} action{actionCount !== 1 ? 's' : ''} set
            </div>
            <Link href="/participant/progress" className="btn-secondary w-full justify-center inline-flex">
              View My Progress
            </Link>
          </div>
        )}

        {today && att.live_checkin && !commitment && (
          <Link href="/participant/training-day/commitment" className="btn-primary w-full justify-center mt-4 inline-flex">
            Share your commitment →
          </Link>
        )}
      </main>
    </>
  );
}
