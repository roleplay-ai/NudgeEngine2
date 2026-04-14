'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';

interface Participant {
  user_id:    string;
  role:       string;
  job_title:  string | null;
  department: string | null;
  status:     string;
  created_at: string;
  users: {
    id:         string;
    email:      string;
    name:       string;
    is_active:  boolean;
  };
}

interface NewUserForm {
  name:       string;
  email:      string;
  role:       'participant' | 'trainer';
  job_title:  string;
  department: string;
  phone:      string;
}

const EMPTY_FORM: NewUserForm = {
  name: '', email: '', role: 'participant', job_title: '', department: '', phone: '',
};

export default function ParticipantsPage() {
  const [users,       setUsers]       = useState<Participant[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [roleFilter,  setRoleFilter]  = useState<'participant' | 'trainer' | 'hr'>('participant');
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState<NewUserForm>(EMPTY_FORM);
  const [creating,    setCreating]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [newCreds,    setNewCreds]    = useState<{ email: string; password: string; name: string } | null>(null);
  const [search,      setSearch]      = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const res  = await fetch(`/api/auth/create-user?role=${roleFilter}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [roleFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter(u =>
    !search ||
    u.users?.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.users?.email?.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const res  = await fetch('/api/auth/create-user', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? 'Failed to create user');
      setCreating(false);
      return;
    }

    setNewCreds({ email: data.email, password: data.temp_password, name: data.name });
    setForm(EMPTY_FORM);
    fetchUsers();
    setCreating(false);
  }

  const ROLE_LABEL: Record<string, string> = { participant: 'Participants', trainer: 'Trainers', hr: 'HR Admins' };

  return (
    <>
      <Topbar title={ROLE_LABEL[roleFilter] ?? 'Users'}>
        <button onClick={() => { setShowModal(true); setNewCreds(null); }} className="btn-primary">
          + Add {form.role === 'trainer' ? 'Trainer' : 'Participant'}
        </button>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">

        {/* Filter tabs */}
        <div className="flex items-center gap-2 mb-6">
          {(['participant', 'trainer', 'hr'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`tab-btn ${roleFilter === r ? 'active' : ''}`}
            >
              {ROLE_LABEL[r]}
            </button>
          ))}
          <input
            className="ml-auto form-input w-56"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ marginBottom: 0 }}
          />
        </div>

        {/* Table */}
        <div className="data-table">
          <div
            className="grid px-5"
            style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
          >
            {['Name', 'Email', 'Department', 'Status', ''].map(h => (
              <div key={h} className="th">{h}</div>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-10 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">
              No {ROLE_LABEL[roleFilter]?.toLowerCase()} found.{' '}
              <button onClick={() => setShowModal(true)} className="text-brand-purple font-semibold">
                Add one →
              </button>
            </div>
          ) : (
            filtered.map(u => (
              <div
                key={u.user_id}
                className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors"
                style={{ gridTemplateColumns: '2fr 1.5fr 1fr 1fr 80px', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
              >
                <div className="td">
                  <div className="flex items-center gap-3">
                    <span
                      className="avatar avatar-sm flex-shrink-0"
                      style={{ background: roleFilter === 'trainer' ? '#3699FC' : '#623CEA' }}
                    >
                      {u.users?.name?.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-brand-dark text-sm">{u.users?.name}</div>
                      {u.job_title && <div className="td-muted">{u.job_title}</div>}
                    </div>
                  </div>
                </div>
                <div className="td text-text-muted text-xs">{u.users?.email}</div>
                <div className="td text-text-muted text-xs">{u.department ?? '—'}</div>
                <div className="td">
                  <span className={`tag ${u.status === 'active' ? 'tag-green' : 'tag-grey'}`}>
                    {u.status}
                  </span>
                </div>
                <div className="td">
                  <button className="text-xs font-bold text-brand-purple hover:opacity-70 transition-opacity bg-none border-0 cursor-pointer">
                    View
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* ── Create User Modal ─────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(34,29,35,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) { setShowModal(false); setNewCreds(null); } }}
        >
          <div
            className="bg-white rounded-[20px] w-full max-w-[480px] overflow-hidden"
            style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}
          >
            {newCreds ? (
              /* Credentials reveal */
              <div className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#23CE68" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 className="text-lg font-extrabold text-brand-dark mb-1">Account Created!</h3>
                <p className="text-text-muted text-sm mb-6">Share these credentials with {newCreds.name}.</p>

                <div className="p-4 rounded-xl text-left mb-6" style={{ background: '#FFF6CF', border: '1px solid rgba(255,206,0,0.3)' }}>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Email</span>
                      <span className="text-sm font-semibold">{newCreds.email}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-text-muted">Password</span>
                      <span className="text-sm font-mono font-bold text-brand-purple">{newCreds.password}</span>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-text-muted mb-5">
                  ⚠️ This password is shown once. Copy it before closing.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => { setNewCreds(null); setForm(EMPTY_FORM); }}
                    className="btn-outline"
                  >
                    Add Another
                  </button>
                  <button onClick={() => setShowModal(false)} className="btn-primary">
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* Create form */
              <form onSubmit={handleCreate}>
                <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(34,29,35,0.08)' }}>
                  <h3 className="text-lg font-extrabold text-brand-dark">Create User Login</h3>
                  <p className="text-sm text-text-muted mt-0.5">A password will be auto-generated and shown once.</p>
                </div>

                <div className="p-6 space-y-4">
                  {error && (
                    <div className="px-4 py-3 rounded-xl text-sm text-brand-red" style={{ background: '#FFF3F3' }}>
                      {error}
                    </div>
                  )}

                  {/* Role tabs */}
                  <div className="flex gap-2">
                    {(['participant', 'trainer'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, role: r }))}
                        className={`tab-btn flex-1 ${form.role === r ? 'active' : ''}`}
                      >
                        {r.charAt(0).toUpperCase() + r.slice(1)}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Full Name *</label>
                      <input
                        className="form-input"
                        placeholder="Arjun Mehta"
                        value={form.name}
                        onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Work Email *</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="arjun@company.com"
                        value={form.email}
                        onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="form-label">Job Title</label>
                      <input className="form-input" placeholder="Team Lead" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
                    </div>
                    <div>
                      <label className="form-label">Department</label>
                      <input className="form-input" placeholder="Engineering" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                    </div>
                    <div className="col-span-2">
                      <label className="form-label">Phone (optional)</label>
                      <input type="tel" className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 flex gap-3 justify-end" style={{ borderTop: '1px solid rgba(34,29,35,0.08)' }}>
                  <button type="button" onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
                  <button type="submit" disabled={creating} className="btn-primary">
                    {creating ? 'Creating…' : `Create ${form.role === 'trainer' ? 'Trainer' : 'Participant'}`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
