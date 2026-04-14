'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import StatusBadge from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface Participant {
  id: string;
  user_id: string;
  status: string;
  cohort_role: string;
  enrolled_date: string;
  users: { id: string; name: string; email: string; avatar_url: string | null };
}

interface CompanyUser {
  user_id: string;
  role: string;
  job_title: string | null;
  department: string | null;
  users: { id: string; name: string; email: string };
}

export default function CohortParticipantsPage() {
  const params = useParams();
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEnroll, setShowEnroll] = useState(false);
  const [companyUsers, setCompanyUsers] = useState<CompanyUser[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [enrolling, setEnrolling] = useState(false);
  const [search, setSearch] = useState('');
  const [cohortName, setCohortName] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cohorts/${params.id}`);
    const data = await res.json();
    setParticipants(data.cohort?.user_cohorts ?? []);
    setCohortName(data.cohort?.name ?? 'Cohort');
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function openEnrollModal() {
    setShowEnroll(true);
    const res = await fetch('/api/auth/create-user?role=participant');
    const data = await res.json();
    setCompanyUsers(data.users ?? []);
  }

  async function handleEnroll() {
    if (selectedIds.length === 0) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/cohorts/${params.id}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_ids: selectedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(`${data.enrolled} participant(s) enrolled!`);
      setShowEnroll(false);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Enrollment failed');
    }
    setEnrolling(false);
  }

  function toggleSelect(userId: string) {
    setSelectedIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  }

  const enrolledIds = new Set(participants.map(p => p.user_id));
  const availableUsers = companyUsers.filter(u =>
    !enrolledIds.has(u.user_id) &&
    (!search || u.users?.name?.toLowerCase().includes(search.toLowerCase()) || u.users?.email?.toLowerCase().includes(search.toLowerCase()))
  );

  const filtered = participants.filter(p =>
    !search || p.users?.name?.toLowerCase().includes(search.toLowerCase()) || p.users?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Topbar title={`Participants — ${cohortName}`}>
        <button onClick={openEnrollModal} className="btn-primary">+ Enroll Participants</button>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <Link href={`/hr/cohorts/${params.id}`} className="text-brand-purple text-sm font-semibold hover:opacity-70 transition-opacity mb-4 inline-block no-underline">
          ← Back to cohort
        </Link>

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="section-label">ENROLLED</div>
            <div className="text-sm text-text-muted">{participants.length} participants</div>
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
            style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
          >
            {['Name', 'Email', 'Role', 'Status', 'Enrolled'].map(h => (
              <div key={h} className="th">{h}</div>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-text-muted text-sm">
              No participants enrolled.{' '}
              <button onClick={openEnrollModal} className="text-brand-purple font-semibold bg-transparent border-0 cursor-pointer">Add some →</button>
            </div>
          ) : (
            filtered.map(p => (
              <div
                key={p.id}
                className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors"
                style={{ gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
              >
                <div className="td">
                  <div className="flex items-center gap-2.5">
                    <span className="avatar avatar-sm">{p.users?.name?.slice(0, 2).toUpperCase()}</span>
                    <span className="font-bold text-sm text-brand-dark">{p.users?.name}</span>
                  </div>
                </div>
                <div className="td text-text-muted text-xs">{p.users?.email}</div>
                <div className="td text-text-muted text-xs capitalize">{p.cohort_role}</div>
                <div className="td"><StatusBadge status={p.status} /></div>
                <div className="td text-text-muted text-xs">
                  {new Date(p.enrolled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Enroll Modal */}
      <Modal open={showEnroll} onClose={() => { setShowEnroll(false); setSelectedIds([]); }} title="Enroll Participants" size="lg" footer={
        <>
          <button onClick={() => setShowEnroll(false)} className="btn-outline">Cancel</button>
          <button onClick={handleEnroll} disabled={enrolling || selectedIds.length === 0} className="btn-primary">
            {enrolling ? 'Enrolling…' : `Enroll ${selectedIds.length} Selected`}
          </button>
        </>
      }>
        <input
          className="form-input mb-4"
          placeholder="Search participants…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {availableUsers.length === 0 ? (
          <p className="text-sm text-text-muted text-center py-4">
            No available participants. All have been enrolled or none exist yet.
          </p>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
            {availableUsers.map(u => {
              const selected = selectedIds.includes(u.user_id);
              return (
                <button
                  key={u.user_id}
                  type="button"
                  onClick={() => toggleSelect(u.user_id)}
                  className="w-full rounded-xl p-3 flex items-center gap-3 transition-all text-left"
                  style={{
                    background: selected ? '#FFF6CF' : '#FAFAF7',
                    border: `1.5px solid ${selected ? '#FFCE00' : 'transparent'}`,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                    style={{
                      background: selected ? '#623CEA' : '#fff',
                      border: `2px solid ${selected ? '#623CEA' : 'rgba(34,29,35,0.15)'}`,
                    }}
                  >
                    {selected && <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span className="avatar avatar-sm">{u.users?.name?.slice(0, 2).toUpperCase()}</span>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-brand-dark">{u.users?.name}</div>
                    <div className="text-xs text-text-muted">{u.users?.email}</div>
                  </div>
                  {u.department && <span className="tag tag-grey">{u.department}</span>}
                </button>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
}
