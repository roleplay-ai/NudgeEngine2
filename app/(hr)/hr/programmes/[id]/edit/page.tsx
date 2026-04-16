'use client';

import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import Topbar from '@/components/layout/Topbar';
import ProgrammeForm from '@/components/forms/ProgrammeForm';
import { useToast } from '@/components/ui/Toast';

interface ProgrammeData {
  id: string;
  name: string;
  description: string | null;
}

export default function EditProgrammePage() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [programme, setProgramme] = useState<ProgrammeData | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetch(`/api/programmes/${params.id}`)
      .then(r => r.json())
      .then(data => {
        setProgramme(data.programme);
        setFetching(false);
      })
      .catch(() => setFetching(false));
  }, [params.id]);

  async function handleSubmit(data: { name: string; description: string }) {
    setLoading(true);
    try {
      const res = await fetch(`/api/programmes/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);

      toast.success('Programme updated!');
      router.push(`/hr/programmes/${params.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update programme');
      setLoading(false);
    }
  }

  if (fetching) {
    return (
      <>
        <Topbar title="Edit Programme" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12 w-full" />)}
          </div>
        </main>
      </>
    );
  }

  if (!programme) {
    return (
      <>
        <Topbar title="Edit Programme" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <p className="text-text-muted">Programme not found.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Edit Programme">
        <button onClick={() => router.back()} className="btn-outline">← Back</button>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="max-w-2xl">
          <div className="section-label">EDIT</div>
          <div className="section-title mb-6">{programme.name}</div>

          <div className="card">
            <ProgrammeForm
              initialData={{
                name: programme.name,
                description: programme.description ?? '',
              }}
              onSubmit={handleSubmit}
              submitLabel="Save Changes"
              loading={loading}
            />
          </div>
        </div>
      </main>
    </>
  );
}
