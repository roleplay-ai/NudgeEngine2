'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import PrereadItem from '@/components/participant/PrereadItem';
import TaskStepIndicator from '@/components/participant/TaskStepIndicator';

interface Resource {
  id: string;
  title: string;
  type: string;
  file_url: string | null;
  duration_minutes: number | null;
}

export default function Task3PrereadsPage() {
  const router = useRouter();
  const [cohortId, setCohortId] = useState('');
  const [resources, setResources] = useState<Resource[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [markingId, setMarkingId] = useState<string | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/participant/cohort');
      if (!res.ok) return;
      const data = await res.json();
      if (!data.cohort) return;
      setCohortId(data.cohort.id);

      const [rRes, tRes] = await Promise.all([
        fetch(`/api/cohorts/${data.cohort.id}/resources`),
        fetch(`/api/resource-tracking/status?cohort_id=${data.cohort.id}`),
      ]);

      let loadedResources: Resource[] = [];
      let loadedReadIds = new Set<string>();

      if (rRes.ok) {
        const rData = await rRes.json();
        loadedResources = rData.resources ?? [];
        setResources(loadedResources);
      }
      if (tRes.ok) {
        const tData = await tRes.json();
        loadedReadIds = new Set(tData.read_ids ?? []);
        setReadIds(loadedReadIds);
      }

      // If all resources were already read (or none exist), ensure task_completions has the row
      const alreadyDone =
        loadedResources.length === 0 ||
        (loadedResources.length > 0 && loadedResources.every(r => loadedReadIds.has(r.id)));
      if (alreadyDone) {
        fetch('/api/participant/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_type: 'prereads', cohort_id: data.cohort.id }),
        }).catch(() => {});
      }

      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (resources.length > 0 && resources.every(r => readIds.has(r.id))) {
      setAllDone(true);
    }
  }, [resources, readIds]);

  async function handleMarkRead(resourceId: string) {
    setMarkingId(resourceId);
    try {
      const res = await fetch('/api/resource-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_id: resourceId, status: 'read' }),
      });

      if (res.ok) {
        const newIds = new Set([...readIds, resourceId]);
        setReadIds(newIds);

        if (newIds.size === resources.length && resources.length > 0) {
          await fetch('/api/participant/tasks', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ task_type: 'prereads', cohort_id: cohortId }),
          });
        }
      }
    } finally {
      setMarkingId(null);
    }
  }

  async function handleContinue() {
    setNavigating(true);
    try {
      // When no resources are assigned, nothing triggered the task completion yet — save it now.
      if (resources.length === 0) {
        await fetch('/api/participant/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ task_type: 'prereads', cohort_id: cohortId }),
        });
      }
      router.push('/participant/pre-training/task-4-intro');
    } catch {
      setNavigating(false);
    }
  }

  if (loading) {
    return (
      <main className="task-page flex-1 overflow-y-auto px-7 py-6">
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
      </main>
    );
  }

  const readCount = resources.filter(r => readIds.has(r.id)).length;
  const total = resources.length;

  return (
    <main className="task-page flex-1 overflow-y-auto px-7 py-6">
      <TaskStepIndicator currentStep={2} isCurrentDone={allDone} />

      <div className="max-w-2xl">
        <div className="section-label" style={{ color: '#3699FC' }}>TASK 03</div>
        <h1 className="section-title text-xl mb-1">Pre-reads</h1>
        <p className="text-sm text-text-muted mb-2">
          Review these materials before your session to get the most out of training day.
        </p>

        {total > 0 && (
          <div className="flex items-center gap-2 mb-5 mt-3">
            <div className="flex-1 progress-wrap" style={{ height: 4 }}>
              <div
                className="progress-fill"
                style={{ width: `${total > 0 ? (readCount / total) * 100 : 0}%`, background: '#3699FC', transition: 'width 0.5s ease' }}
              />
            </div>
            <span className="text-xs font-bold text-brand-dark">{readCount}/{total} read</span>
          </div>
        )}

        {allDone && (
          <div
            className="rounded-2xl px-5 py-4 mb-5 flex items-center gap-3"
            style={{ background: '#F0FFF7', border: '1.5px solid rgba(35,206,104,0.3)' }}
          >
            <span className="text-xl">✅</span>
            <div>
              <div className="text-sm font-bold text-brand-dark">All pre-reads complete!</div>
              <div className="text-xs text-text-muted">Great work — you&apos;re well prepared for training day.</div>
            </div>
          </div>
        )}

        {resources.length === 0 ? (
          <div className="card py-8 text-center">
            <p className="text-2xl mb-2">📚</p>
            <p className="text-sm text-text-muted">No pre-read materials have been uploaded yet. Check back closer to the session.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {resources.map(resource => (
              <PrereadItem
                key={resource.id}
                resource={resource}
                isRead={readIds.has(resource.id)}
                onMarkRead={handleMarkRead}
                loading={markingId === resource.id}
              />
            ))}
          </div>
        )}

        <button
          className="btn-primary w-full mt-6"
          type="button"
          onClick={handleContinue}
          disabled={(!allDone && resources.length > 0) || navigating}
          style={{ height: 48, fontSize: 14 }}
        >
          {navigating ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
              Loading…
            </span>
          ) : resources.length === 0 ? 'Continue to Task 4 →' : allDone ? 'Continue to Task 4 →' : `Mark all ${total} materials as read to continue`}
        </button>

        <button
          type="button"
          className="btn-outline w-full mt-3"
          onClick={() => router.push('/participant/pre-training')}
          style={{ height: 40, fontSize: 13 }}
        >
          ← Back to Hub
        </button>
      </div>
    </main>
  );
}
