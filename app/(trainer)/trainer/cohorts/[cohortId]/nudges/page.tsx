'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import NudgeBuilder from '@/components/trainer/NudgeBuilder';
import NudgeCard from '@/components/trainer/NudgeCard';

interface Skill {
  id: string;
  name: string;
}

interface Nudge {
  id: string;
  what: string;
  how: string | null;
  why: string | null;
  time_minutes: number;
  scheduled_date: string | null;
  skills: Skill | null;
  created_at: string;
}

export default function TrainerNudgesPage() {
  const params = useParams();
  const cohortId = params.cohortId as string;
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [nRes, cRes] = await Promise.all([
        fetch(`/api/nudges?cohort_id=${cohortId}`),
        fetch(`/api/trainer/live-attendance?cohort_id=${cohortId}`),
      ]);

      if (nRes.ok) {
        const d = await nRes.json();
        setNudges(d.nudges ?? []);
      }

      // Fetch skills from programme
      if (cRes.ok) {
        const cd = await cRes.json();
        const cohortSkills = cd.skills ?? [];
        setSkills(cohortSkills);
      } else {
        // Fallback: fetch skills from cohort's programme
        const cohortRes = await fetch(`/api/participant/cohort`);
        if (cohortRes.ok) {
          const cohortData = await cohortRes.json();
          const prg = cohortData?.cohort?.programmes;
          if (prg?.skills) setSkills(prg.skills);
        }
      }

      setLoading(false);
    }
    load();
  }, [cohortId]);

  // Fetch programme skills separately
  useEffect(() => {
    async function fetchSkills() {
      const res = await fetch(`/api/hr/programme-skills?cohort_id=${cohortId}`);
      if (res.ok) {
        const d = await res.json();
        setSkills(d.skills ?? []);
      }
    }
    fetchSkills();
  }, [cohortId]);

  function handleNudgeCreated(nudge: Record<string, unknown>) {
    setNudges(prev => [nudge as unknown as Nudge, ...prev]);
  }

  function handleNudgeDeleted(id: string) {
    setNudges(prev => prev.filter(n => n.id !== id));
  }

  const scheduled = nudges.filter(n => n.scheduled_date);
  const unscheduled = nudges.filter(n => !n.scheduled_date);

  return (
    <>
      <Topbar title="Nudge Builder" />
      <main className="flex-1 overflow-y-auto px-6 py-6 max-w-2xl mx-auto">
        <Link href={`/trainer/cohorts/${cohortId}/post-training`} className="text-xs font-semibold no-underline mb-4 inline-block" style={{ color: 'var(--text-muted)' }}>
          ← Back to Post-Training
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Builder */}
          <div>
            <NudgeBuilder
              cohortId={cohortId}
              skills={skills}
              onCreated={handleNudgeCreated}
            />
          </div>

          {/* Existing nudges */}
          <div>
            <h2 className="font-bold text-brand-dark text-base mb-3">Existing Nudges</h2>

            {loading ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
            ) : nudges.length === 0 ? (
              <div className="card text-center py-8">
                <p className="text-2xl mb-2">💡</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  No nudges yet. Create your first nudge to keep participants engaged.
                </p>
              </div>
            ) : (
              <>
                {scheduled.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                      SCHEDULED
                    </p>
                    {scheduled.map(n => (
                      <NudgeCard key={n.id} nudge={n} onDeleted={handleNudgeDeleted} />
                    ))}
                  </div>
                )}
                {unscheduled.length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase mb-2" style={{ color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
                      UNSCHEDULED
                    </p>
                    {unscheduled.map(n => (
                      <NudgeCard key={n.id} nudge={n} onDeleted={handleNudgeDeleted} />
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
