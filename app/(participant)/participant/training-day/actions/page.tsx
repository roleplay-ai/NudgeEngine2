'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import ActionSelector from '@/components/participant/ActionSelector';

export default function TrainingDayActionsPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string | null>(null);
  const [existingActions, setExistingActions] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const cRes = await fetch('/api/participant/cohort');
      if (!cRes.ok) return;
      const cData = await cRes.json();
      if (!cData.cohort) {
        setLoading(false);
        return;
      }
      setCohortId(cData.cohort.id);

      const cmRes = await fetch(`/api/commitments?cohort_id=${cData.cohort.id}`);
      if (cmRes.ok) {
        const cmData = await cmRes.json();
        if (cmData.commitment_plan?.id) {
          setPlanId(cmData.commitment_plan.id);
        }
        setExistingActions((cmData.actions ?? []).length);
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <>
        <Topbar title="Actions" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="card py-12 text-center text-text-muted">Loading…</div>
        </main>
      </>
    );
  }

  if (!cohortId || !planId) {
    return (
      <>
        <Topbar title="Actions" />
        <main className="flex-1 overflow-y-auto px-7 py-6 max-w-2xl">
          <div className="card py-8 text-center">
            <p className="text-sm text-text-muted mb-4">Save your commitment first.</p>
            <Link href="/participant/training-day/commitment" className="btn-primary inline-flex justify-center">
              Go to commitment
            </Link>
          </div>
        </main>
      </>
    );
  }

  if (existingActions > 0) {
    return (
      <>
        <Topbar title="Actions" />
        <main className="flex-1 overflow-y-auto px-7 py-6 max-w-2xl text-center">
          <div className="card py-10">
            <p className="text-2xl mb-3">✅</p>
            <h1 className="font-bold text-brand-dark text-lg mb-2">You already have actions</h1>
            <p className="text-sm text-text-muted mb-6">
              {existingActions} action{existingActions !== 1 ? 's' : ''} on your plan. You can track progress from Training Day or My Progress.
            </p>
            <Link href="/participant/training-day" className="btn-primary inline-flex justify-center">
              Back to Training Day
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Your actions" />
      <main className="flex-1 overflow-y-auto px-7 py-6 max-w-2xl">
        <Link href="/participant/training-day" className="text-xs text-text-muted hover:text-brand-dark mb-4 inline-block">
          ← Training day
        </Link>
        <div className="section-label mb-2">TRAINING DAY</div>
        <h1 className="section-title text-xl mb-2">Choose your actions</h1>
        <p className="text-sm text-text-muted mb-6">
          Pick specific steps from your company&apos;s library — or add your own — so your commitment becomes real.
        </p>

        <ActionSelector
          commitmentPlanId={planId}
          onConfirmed={() => router.push('/participant/training-day')}
        />
      </main>
    </>
  );
}
