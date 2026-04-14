'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import { useToast } from '@/components/ui/Toast';

export default function NewTrainerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: '', email: '', job_title: '', department: '', phone: '' });
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creds, setCreds] = useState<{ email: string; password: string; name: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    try {
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, role: 'trainer' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCreds({ email: data.email, password: data.temp_password, name: data.name });
      toast.success('Trainer created!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create trainer');
    }
    setCreating(false);
  }

  if (creds) {
    return (
      <>
        <Topbar title="Trainer Created" />
        <main className="flex-1 overflow-y-auto px-7 py-6">
          <div className="max-w-md mx-auto">
            <div className="card text-center">
              <div className="w-14 h-14 rounded-2xl bg-brand-green/10 flex items-center justify-center mx-auto mb-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#23CE68" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h3 className="text-lg font-extrabold text-brand-dark mb-1">Trainer Account Created!</h3>
              <p className="text-text-muted text-sm mb-6">Share these credentials with {creds.name}.</p>

              <div className="p-4 rounded-xl text-left mb-6" style={{ background: '#FFF6CF', border: '1px solid rgba(255,206,0,0.3)' }}>
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-muted">Email</span>
                    <span className="text-sm font-semibold">{creds.email}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-text-muted">Password</span>
                    <span className="text-sm font-mono font-bold text-brand-purple">{creds.password}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-text-muted mb-5">⚠️ This password is shown once. Copy it before leaving.</p>

              <div className="flex gap-3 justify-center">
                <button onClick={() => { setCreds(null); setForm({ name: '', email: '', job_title: '', department: '', phone: '' }); }} className="btn-outline">
                  Add Another
                </button>
                <button onClick={() => router.push('/hr/trainers')} className="btn-primary">
                  Done
                </button>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="Add Trainer">
        <button onClick={() => router.back()} className="btn-outline">← Back</button>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="max-w-lg">
          <div className="section-label">CREATE</div>
          <div className="section-title mb-6">New Trainer</div>

          <div className="card">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-xl text-sm text-brand-red" style={{ background: '#FFF3F3' }}>{error}</div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input className="form-input" placeholder="Gaurav Patel" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label">Email *</label>
                  <input type="email" className="form-input" placeholder="gaurav@company.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                </div>
                <div>
                  <label className="form-label">Job Title</label>
                  <input className="form-input" placeholder="Senior Facilitator" value={form.job_title} onChange={e => setForm(f => ({ ...f, job_title: e.target.value }))} />
                </div>
                <div>
                  <label className="form-label">Department</label>
                  <input className="form-input" placeholder="L&D" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Phone (optional)</label>
                  <input type="tel" className="form-input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => router.back()} className="btn-outline">Cancel</button>
                <button type="submit" disabled={creating} className="btn-primary">
                  {creating ? 'Creating…' : 'Create Trainer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
