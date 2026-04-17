'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import ProgressHero from '@/components/participant/ProgressHero';
import BuddyCard from '@/components/participant/BuddyCard';

interface ActionStats {
  total: number;
  completed: number;
  in_progress: number;
  pending: number;
  completion_rate: number;
}

interface SkillJourneyItem {
  skill: { id: string; name: string };
  pre_rating: number | null;
  post_rating: number | null;
  growth: number | null;
}

interface Action {
  id: string;
  custom_title: string | null;
  status: string;
  skills: { id: string; name: string } | null;
}

interface Nudge {
  id: string;
  what: string;
  how: string | null;
  why: string | null;
  time_minutes: number;
  scheduled_date: string | null;
}

interface Buddy {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface ProgressData {
  participant: { id: string; name: string };
  commitment_plan: { main_commitment: string } | null;
  actions: Action[];
  action_stats: ActionStats;
  skill_journey: SkillJourneyItem[];
  confidence_checkins: { confidence_score: number; week_number: number }[];
  latest_confidence: { confidence_score: number; week_number: number } | null;
  buddy: { user: Buddy } | null;
  days_since_training: number;
  growth_score: number;
}

export default function ProgressPage() {
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [data, setData] = useState<ProgressData | null>(null);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingDone, setMarkingDone] = useState<string | null>(null);

  const load = useCallback(async () => {
    const cRes = await fetch('/api/participant/cohort');
    if (!cRes.ok) { setLoading(false); return; }
    const cData = await cRes.json();
    if (!cData.cohort) { setLoading(false); return; }

    const cid = cData.cohort.id as string;
    setCohortId(cid);

    const [pRes, nRes] = await Promise.all([
      fetch(`/api/progress/summary?cohort_id=${cid}`),
      fetch(`/api/nudges?cohort_id=${cid}`),
    ]);

    if (pRes.ok) {
      const pd = await pRes.json();
      setData(pd);
    }
    if (nRes.ok) {
      const nd = await nRes.json();
      const today = new Date().toISOString().split('T')[0];
      setNudges((nd.nudges ?? []).filter((n: Nudge) => !n.scheduled_date || n.scheduled_date <= today));
    }

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleMarkNudgeDone(nudgeId: string) {
    setMarkingDone(nudgeId);
    setNudges(ns => ns.filter(n => n.id !== nudgeId));
    setMarkingDone(null);
  }

  if (loading) return (
    <>
      <Topbar title="My Progress" />
      <main className="flex-1 overflow-y-auto px-5 py-6 flex items-center justify-center">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading your progress…</p>
      </main>
    </>
  );

  if (!data || !cohortId) return (
    <>
      <Topbar title="My Progress" />
      <main className="flex-1 overflow-y-auto px-5 py-6 max-w-lg mx-auto">
        <div className="card py-12 text-center">
          <p className="text-3xl mb-4">📈</p>
          <h2 className="font-bold text-brand-dark mb-2">No progress yet</h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            Complete your training day tasks first to see your growth journey here.
          </p>
          <Link href="/participant/training-day" className="btn-primary inline-flex justify-center">
            Go to Training Day
          </Link>
        </div>
      </main>
    </>
  );

  const { participant, action_stats, skill_journey, latest_confidence, buddy, days_since_training, growth_score, actions } = data;
  const skillsImproved = skill_journey.filter(s => s.growth !== null && s.growth > 0).length;
  const recentActions = actions.slice(0, 3);
  const miniSkills = skill_journey.slice(0, 2);
  const todayNudge = nudges[0] ?? null;

  return (
    <>
      <Topbar title="My Progress" />
      <main className="flex-1 overflow-y-auto px-5 py-6 max-w-lg mx-auto">
        {/* Hero */}
        <ProgressHero
          name={participant.name}
          growthScore={growth_score}
          actionStats={action_stats}
          daysSinceTraining={days_since_training}
          latestConfidence={latest_confidence?.confidence_score ?? null}
          skillsImproved={skillsImproved}
        />

        {/* Today's Nudge */}
        {todayNudge && (
          <div className="rounded-2xl p-5 mb-5" style={{ background: 'var(--dark)', color: '#fff' }}>
            <p className="text-xs font-bold mb-2" style={{ color: 'var(--yellow)', letterSpacing: '0.08em' }}>
              TODAY&apos;S NUDGE
            </p>
            <p className="font-bold text-sm mb-1">{todayNudge.what}</p>
            {todayNudge.how && (
              <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{todayNudge.how}</p>
            )}
            {todayNudge.why && (
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}><em>{todayNudge.why}</em></p>
            )}
            <p className="text-xs mt-2 mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>⏱ {todayNudge.time_minutes} min</p>
            <div className="flex gap-2">
              <button
                onClick={() => handleMarkNudgeDone(todayNudge.id)}
                disabled={markingDone === todayNudge.id}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'var(--green)', color: '#fff' }}
              >
                Done! ✓
              </button>
              <button
                onClick={() => setNudges(ns => ns.filter(n => n.id !== todayNudge.id))}
                className="flex-1 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}
              >
                Skip
              </button>
            </div>
          </div>
        )}

        {/* My Actions */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-brand-dark">My Actions</h2>
            <Link href="/participant/progress/actions" className="text-xs font-semibold no-underline" style={{ color: 'var(--purple)' }}>
              See all →
            </Link>
          </div>

          {recentActions.length === 0 ? (
            <div className="card text-center py-6">
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No actions yet.</p>
              <Link href="/participant/training-day/actions" className="text-xs font-semibold mt-2 inline-block" style={{ color: 'var(--purple)' }}>
                Add actions →
              </Link>
            </div>
          ) : (
            recentActions.map(a => {
              const STATUS_DOT: Record<string, string> = { pending: '#8A8090', in_progress: 'var(--yellow)', completed: 'var(--green)', delayed: 'var(--orange)', skipped: 'var(--red)' };
              return (
                <div key={a.id} className="card mb-2 flex items-center gap-3">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: STATUS_DOT[a.status] ?? '#8A8090' }} />
                  <span className="text-sm font-medium text-brand-dark flex-1">{a.custom_title ?? 'Action'}</span>
                  {a.skills && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(98,60,234,0.1)', color: 'var(--purple)' }}>
                      {a.skills.name}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Skill Growth */}
        {miniSkills.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-brand-dark">Skill Growth</h2>
              <Link href="/participant/progress/skill-journey" className="text-xs font-semibold no-underline" style={{ color: 'var(--purple)' }}>
                See full journey →
              </Link>
            </div>
            {miniSkills.map(item => (
              <div key={item.skill.id} className="card mb-2">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-brand-dark">{item.skill.name}</p>
                  {item.growth !== null && (
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: item.growth >= 0 ? 'rgba(35,206,104,0.12)' : 'rgba(237,69,81,0.12)',
                        color: item.growth >= 0 ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {item.growth >= 0 ? '+' : ''}{item.growth.toFixed(1)} ↑
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  {[{ label: 'Before', val: item.pre_rating, color: '#8A8090' }, { label: 'Now', val: item.post_rating, color: 'var(--yellow)' }].map(b => (
                    <div key={b.label} className="flex-1">
                      <div className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{b.label}</div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(34,29,35,0.08)' }}>
                        <div className="h-full rounded-full" style={{ width: `${((b.val ?? 0) / 5) * 100}%`, background: b.color }} />
                      </div>
                      <div className="text-xs font-bold mt-0.5">{b.val != null ? `${b.val}/5` : '—'}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Confidence */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-brand-dark">Confidence</h2>
            <Link href="/participant/progress/confidence" className="text-xs font-semibold no-underline" style={{ color: 'var(--purple)' }}>
              {latest_confidence ? 'Check in again →' : 'Check in this week →'}
            </Link>
          </div>
          {latest_confidence ? (
            <div className="card flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black flex-shrink-0"
                style={{ background: 'rgba(255,206,0,0.15)', color: 'var(--yellow)' }}
              >
                {latest_confidence.confidence_score}
              </div>
              <div>
                <p className="text-sm font-bold text-brand-dark">Week {latest_confidence.week_number}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>out of 10</p>
              </div>
            </div>
          ) : (
            <div className="card text-center py-4">
              <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>No check-in yet this week.</p>
              <Link href="/participant/progress/confidence" className="btn-primary inline-flex justify-center text-xs px-4 py-2">
                Rate your confidence →
              </Link>
            </div>
          )}
        </div>

        {/* Buddy */}
        {buddy && (
          <div className="mb-5">
            <h2 className="font-bold text-brand-dark mb-3">Your Buddy</h2>
            <BuddyCard buddy={buddy.user} cohortId={cohortId} />
          </div>
        )}
      </main>
    </>
  );
}
