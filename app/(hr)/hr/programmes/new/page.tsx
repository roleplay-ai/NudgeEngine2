'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Topbar from '@/components/layout/Topbar';
import ProgrammeForm from '@/components/forms/ProgrammeForm';
import { useToast } from '@/components/ui/Toast';

export default function NewProgrammePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(data: { name: string; description: string }) {
    setLoading(true);
    try {
      const res = await fetch('/api/programmes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();

      if (!res.ok) throw new Error(result.error);

      toast.success('Programme created successfully!');
      router.push(`/hr/programmes/${result.programme.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create programme');
      setLoading(false);
    }
  }

  return (
    <>
      <Topbar title="New Programme">
        <button onClick={() => router.back()} className="btn-outline">← Back</button>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="max-w-2xl">
          <div className="section-label">CREATE</div>
          <div className="section-title mb-6">New Training Programme</div>

          <div className="card">
            <ProgrammeForm onSubmit={handleSubmit} loading={loading} />
          </div>
        </div>
      </main>
    </>
  );
}
