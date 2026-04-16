'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Topbar from '@/components/layout/Topbar';
import CommitmentForm from '@/components/participant/CommitmentForm';

export default function CommitmentPage() {
  const [cohortId, setCohortId] = useState<string | null>(null);
  const [initial, setInitial] = useState<{
    main_commitment: string;
    why_text: string | null;
    blockers: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

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
        if (cmData.commitment_plan) {
          setInitial(cmData.commitment_plan);
        }
      }
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <>
        <Topbar title="Commitment" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="card py-12 text-center text-text-muted">Loading…</div>
        </main>
      </>
    );
  }

  if (!cohortId) {
    return (
      <>
        <Topbar title="Commitment" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="card py-12 text-center">No cohort found.</div>
        </main>
      </>
    );
  }

  if (saved) {
    return (
      <>
        <Topbar title="Commitment" />
        <main className="flex-1 overflow-y-auto px-7 py-6 max-w-2xl mx-auto text-center">
          <div className="card py-12">
            <p className="text-3xl mb-4">⛳</p>
            <h1 className="font-bold text-brand-dark text-xl mb-2">Commitment saved</h1>
            <p className="text-sm text-text-muted mb-6">Now choose your next actions to make it real.</p>
            <Link href="/participant/training-day/actions" className="btn-primary inline-flex justify-center">
              Choose actions →
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Your commitment" />
      <main className="flex-1 overflow-y-auto px-7 py-6 max-w-2xl">
        <Link href="/participant/training-day" className="text-xs text-text-muted hover:text-brand-dark mb-4 inline-block">
          ← Training day
        </Link>
        <div className="section-label mb-2">TRAINING DAY</div>
        <h1 className="section-title text-xl mb-6">Shape your commitment</h1>

        <CommitmentForm
          cohortId={cohortId}
          initial={initial}
          onSaved={() => setSaved(true)}
        />
      </main>
    </>
  );
}
