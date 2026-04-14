'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';

interface Trainer {
  user_id: string;
  role: string;
  job_title: string | null;
  department: string | null;
  status: string;
  created_at: string;
  users: { id: string; email: string; name: string; is_active: boolean };
}

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchTrainers = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/auth/create-user?role=trainer');
    const data = await res.json();
    setTrainers(data.users ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchTrainers(); }, [fetchTrainers]);

  const filtered = trainers.filter(t =>
    !search ||
    t.users?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.users?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Topbar title="Trainers">
        <Link href="/hr/trainers/new" className="btn-primary">+ Add Trainer</Link>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label">TEAM</div>
            <div className="section-title">All Trainers</div>
          </div>
          <input
            className="form-input w-56"
            placeholder="Search…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>

        <div className="data-table">
          <div
            className="grid px-5"
            style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
          >
            {['Name', 'Email', 'Department', 'Status'].map(h => (
              <div key={h} className="th">{h}</div>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">
              No trainers found.{' '}
              <Link href="/hr/trainers/new" className="text-brand-purple font-semibold">Add one →</Link>
            </div>
          ) : (
            filtered.map(t => (
              <div
                key={t.user_id}
                className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors"
                style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
              >
                <div className="td">
                  <div className="flex items-center gap-3">
                    <span className="avatar avatar-sm" style={{ background: '#3699FC' }}>
                      {t.users?.name?.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-brand-dark">{t.users?.name}</div>
                      {t.job_title && <div className="td-muted">{t.job_title}</div>}
                    </div>
                  </div>
                </div>
                <div className="td text-text-muted text-xs">{t.users?.email}</div>
                <div className="td text-text-muted text-xs">{t.department ?? '—'}</div>
                <div className="td">
                  <span className={`tag ${t.status === 'active' ? 'tag-green' : 'tag-grey'}`}>{t.status}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </>
  );
}
