'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface CohortDetail {
  id: string;
  name: string;
  status: string;
  training_date: string;
  training_time: string | null;
  location: string | null;
  max_participants: number;
  programmes: { id: string; name: string; description: string | null } | null;
  users: { id: string; name: string; email: string; avatar_url: string | null } | null;
  cohort_phases: { id: string; name: string; sequence_order: number }[];
  user_cohorts: { id: string; user_id: string; status: string; cohort_role: string; enrolled_date: string; users: { id: string; name: string; email: string } }[];
  resources: { id: string; title: string; type: string; file_url: string; duration_minutes: number | null; sort_order: number }[];
}

const STATUS_ACTIONS: Record<string, { label: string; next: string; cls: string }> = {
  draft:     { label: 'Mark as Scheduled', next: 'scheduled', cls: 'btn-primary' },
  scheduled: { label: 'Go Live',           next: 'live',      cls: 'btn-emerald' },
  live:      { label: 'Complete Session',  next: 'completed', cls: 'btn-dark' },
};

const TABS = ['Pre-Training', 'Training Day', 'Post-Training', 'Resources'] as const;

export default function CohortDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [cohort, setCohort] = useState<CohortDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<typeof TABS[number]>('Pre-Training');
  const [transitioning, setTransitioning] = useState(false);

  const fetchCohort = useCallback(async () => {
    const res = await fetch(`/api/cohorts/${params.id}`);
    const data = await res.json();
    setCohort(data.cohort);
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchCohort(); }, [fetchCohort]);

  async function handleStatusChange() {
    if (!cohort) return;
    const action = STATUS_ACTIONS[cohort.status];
    if (!action) return;

    setTransitioning(true);
    try {
      const res = await fetch(`/api/cohorts/${cohort.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: action.next }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success(`Cohort marked as ${action.next}`);
      fetchCohort();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
    setTransitioning(false);
  }

  if (loading) {
    return (
      <>
        <Topbar title="Cohort" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
        </main>
      </>
    );
  }

  if (!cohort) {
    return (
      <>
        <Topbar title="Cohort" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <p className="text-text-muted">Cohort not found.</p>
        </main>
      </>
    );
  }

  const participants = cohort.user_cohorts ?? [];
  const resources = cohort.resources ?? [];
  const statusAction = STATUS_ACTIONS[cohort.status];

  return (
    <>
      <Topbar title={cohort.name}>
        {statusAction && (
          <button onClick={handleStatusChange} disabled={transitioning} className={statusAction.cls}>
            {transitioning ? 'Updating…' : statusAction.label}
          </button>
        )}
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <Link href="/hr/cohorts" className="text-brand-purple text-sm font-semibold hover:opacity-70 transition-opacity mb-4 inline-block no-underline">
          ← Back to cohorts
        </Link>

        {/* Header card */}
        <div className="card mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-extrabold text-brand-dark">{cohort.name}</h2>
                <StatusBadge status={cohort.status} />
              </div>
              <div className="text-sm text-text-muted mb-3">
                {cohort.programmes?.name}
              </div>
              <div className="flex items-center gap-5 text-xs text-text-muted">
                <span>📅 {new Date(cohort.training_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                {cohort.training_time && <span>🕐 {cohort.training_time}</span>}
                {cohort.location && <span>📍 {cohort.location}</span>}
                <span>👥 {participants.length} / {cohort.max_participants}</span>
              </div>
            </div>
            {cohort.users && (
              <div className="flex items-center gap-2.5">
                <span className="avatar" style={{ background: '#3699FC' }}>
                  {cohort.users.name?.slice(0, 2).toUpperCase()}
                </span>
                <div>
                  <div className="text-sm font-bold text-brand-dark">{cohort.users.name}</div>
                  <div className="text-xs text-text-muted">Trainer</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-5">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab === t ? 'active' : ''}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Pre-Training tab */}
        {tab === 'Pre-Training' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="section-label">ENROLLED PARTICIPANTS</div>
              <Link href={`/hr/cohorts/${cohort.id}/participants`} className="btn-outline" style={{ padding: '6px 16px', fontSize: '12px' }}>
                Manage Participants →
              </Link>
            </div>

            <div className="data-table">
              <div
                className="grid px-5"
                style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
              >
                {['Name', 'Email', 'Status', 'Enrolled'].map(h => (
                  <div key={h} className="th">{h}</div>
                ))}
              </div>

              {participants.length === 0 ? (
                <div className="py-10 text-center text-text-muted text-sm">
                  No participants enrolled yet.{' '}
                  <Link href={`/hr/cohorts/${cohort.id}/participants`} className="text-brand-purple font-semibold">Add participants →</Link>
                </div>
              ) : (
                participants.slice(0, 10).map(uc => (
                  <div
                    key={uc.id}
                    className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors"
                    style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
                  >
                    <div className="td">
                      <div className="flex items-center gap-2.5">
                        <span className="avatar avatar-sm">{uc.users?.name?.slice(0, 2).toUpperCase()}</span>
                        <span className="font-bold text-sm text-brand-dark">{uc.users?.name}</span>
                      </div>
                    </div>
                    <div className="td text-text-muted text-xs">{uc.users?.email}</div>
                    <div className="td"><StatusBadge status={uc.status} /></div>
                    <div className="td text-text-muted text-xs">
                      {new Date(uc.enrolled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
            {participants.length > 10 && (
              <div className="text-center mt-3">
                <Link href={`/hr/cohorts/${cohort.id}/participants`} className="text-xs font-semibold text-brand-purple">
                  View all {participants.length} participants →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Training Day tab - placeholder */}
        {tab === 'Training Day' && (
          <div className="card text-center py-12">
            <div className="text-3xl mb-3">🎓</div>
            <p className="text-sm font-bold text-brand-dark mb-1">Training Day</p>
            <p className="text-xs text-text-muted">Live session features will be available in Phase 4.</p>
          </div>
        )}

        {/* Post-Training tab - placeholder */}
        {tab === 'Post-Training' && (
          <div className="card text-center py-12">
            <div className="text-3xl mb-3">📈</div>
            <p className="text-sm font-bold text-brand-dark mb-1">Post-Training</p>
            <p className="text-xs text-text-muted">Progress tracking will be available in Phase 5.</p>
          </div>
        )}

        {/* Resources tab */}
        {tab === 'Resources' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="section-label">PRE-READ RESOURCES</div>
              <Link href={`/hr/cohorts/${cohort.id}/resources`} className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}>
                Manage Resources →
              </Link>
            </div>

            {resources.length === 0 ? (
              <div className="card text-center py-10">
                <p className="text-sm text-text-muted mb-3">No resources uploaded yet.</p>
                <Link href={`/hr/cohorts/${cohort.id}/resources`} className="btn-outline">Upload Resources</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {resources.map(r => {
                  const icons: Record<string, string> = { pdf: '📄', video: '🎬', link: '🔗', article: '📰' };
                  return (
                    <div key={r.id} className="card flex items-center gap-4" style={{ padding: '14px 18px', marginBottom: '8px' }}>
                      <span className="text-xl">{icons[r.type] ?? '📄'}</span>
                      <div className="flex-1">
                        <div className="text-sm font-bold text-brand-dark">{r.title}</div>
                        <div className="text-xs text-text-muted">
                          {r.type.toUpperCase()}{r.duration_minutes ? ` · ${r.duration_minutes} min` : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
