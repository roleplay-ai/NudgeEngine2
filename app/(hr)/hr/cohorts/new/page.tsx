'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import CohortForm from '@/components/forms/CohortForm';
import { useToast } from '@/components/ui/Toast';

export default function NewCohortPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: {
    programme_id: string;
    name: string;
    trainer_user_id: string;
    training_date: string;
    training_time: string;
    location: string;
    max_participants: number;
    candidate_user_ids: string[];
  }) {
    setLoading(true);
    try {
      const res = await fetch('/api/cohorts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          programme_id: data.programme_id,
          name: data.name,
          trainer_user_id: data.trainer_user_id,
          training_date: data.training_date,
          training_time: data.training_time,
          location: data.location,
          max_participants: data.max_participants,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      if (Array.isArray(data.candidate_user_ids) && data.candidate_user_ids.length > 0) {
        const enrollRes = await fetch(`/api/cohorts/${result.cohort.id}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_ids: data.candidate_user_ids }),
        });
        const enrollResult = await enrollRes.json();
        if (!enrollRes.ok) throw new Error(enrollResult.error);
      }

      toast.success('Cohort created successfully!');
      router.push(`/hr/cohorts/${result.cohort.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create cohort');
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="New Cohort">
        <button onClick={() => router.back()} className="btn-outline">← Back</button>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="max-w-2xl">
          <div className="section-label">CREATE</div>
          <div className="section-title mb-6">New Training Cohort</div>

          <div className="card">
            <CohortForm onSubmit={handleSubmit} loading={loading} />
          </div>
        </div>
      </main>
    </>
  );
}
