'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import LiveAttendanceBoard from '@/components/trainer/LiveAttendanceBoard';
import CommitmentsSummary from '@/components/trainer/CommitmentsSummary';
import { createClient } from '@/lib/supabase/client';

interface Participant {
  user: { id: string; name: string; email: string; avatar_url: string | null };
  attendance: { pre_confirmed: boolean; live_checkin: boolean };
  has_commitment: boolean;
  action_count: number;
}

interface Stats {
  total_enrolled: number;
  pre_confirmed: number;
  checked_in: number;
  committed: number;
}

export default function TrainerLivePage() {
  const params = useParams();
  const cohortId = params.cohortId as string;

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [notes, setNotes] = useState('');
  const [checkInClosed, setCheckInClosed] = useState(false);
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/trainer/live-attendance?cohort_id=${cohortId}`);
    if (!res.ok) return;
    const data = await res.json();
    setParticipants(data.participants ?? []);
    setStats(data.stats ?? null);
  }, [cohortId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`attendance-live-${cohortId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `cohort_id=eq.${cohortId}`,
        },
        () => {
          load();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [cohortId, load]);

  async function sendReminder() {
    setSending(true);
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort_id: cohortId,
          content:
            'Reminder: please check in on your Training Day page if you haven’t already — we’re about to start!',
          is_batch: true,
        }),
      });
    } finally {
      setSending(false);
    }
  }

  const checked = stats?.checked_in ?? 0;
  const total = stats?.total_enrolled ?? 0;

  return (
    <>
      <Topbar title="Live session" />
      <main className="flex-1 overflow-y-auto px-7 py-6">
        <Link href={`/trainer/cohorts/${cohortId}`} className="text-xs text-text-muted hover:text-brand-dark mb-3 inline-block">
          ← Back to cohort
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <div className="section-label">LIVE</div>
            <h1 className="section-title">Session dashboard</h1>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black text-brand-dark">
              {checked}/{total}
            </div>
            <div className="text-[10px] font-bold uppercase text-text-muted">checked in</div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <CommitmentsSummary committed={stats.committed} total={stats.total_enrolled} />
            <div className="card flex flex-col justify-center gap-3" style={{ marginBottom: 0 }}>
              <button
                type="button"
                className="btn-secondary w-full justify-center text-xs"
                onClick={sendReminder}
                disabled={sending}
              >
                {sending ? 'Sending…' : 'Send check-in reminder (batch)'}
              </button>
              <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkInClosed}
                  onChange={e => setCheckInClosed(e.target.checked)}
                />
                Close check-in (local note for you)
              </label>
            </div>
          </div>
        )}

        <div className="section-label mb-3">ATTENDANCE</div>
        <LiveAttendanceBoard participants={participants} />

        <div className="card mt-6" style={{ marginBottom: 0 }}>
          <div className="section-label mb-2">SESSION NOTES</div>
          <textarea
            className="w-full rounded-xl border px-4 py-3 text-sm resize-none"
            style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 100 }}
            placeholder="Private notes for this session (not saved to the server yet)"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <p className="text-[10px] text-text-muted mt-2">Notes stay in your browser for this session only.</p>
        </div>
      </main>
    </>
  );
}
