'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import Link from 'next/link';

const PLANS = ['free', 'starter', 'growth', 'enterprise'] as const;

export default function NewOrganisationPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    org_name:      '',
    org_slug:      '',
    domain:        '',
    plan:          'starter' as typeof PLANS[number],
    primary_color: '#623CEA',
    hr_name:       '',
    hr_email:      '',
    hr_job_title:  '',
    hr_department: '',
  });

  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState<{ org_name: string; hr_email: string; temp_password: string } | null>(null);

  function handleChange(field: keyof typeof form, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Auto-generate slug from org name
      if (field === 'org_name') {
        next.org_slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/create-organisation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Failed to create organisation');
        return;
      }

      setSuccess({
        org_name:      form.org_name,
        hr_email:      form.hr_email,
        temp_password: data.temp_password,
      });
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <>
        <Topbar title="Organisation Created" />
        <main className="flex-1 overflow-y-auto px-7 py-6 flex items-start justify-center">
          <div className="w-full max-w-[520px]">
            <div className="card text-center py-10">
              <div className="w-16 h-16 rounded-2xl bg-brand-green/10 flex items-center justify-center mx-auto mb-4">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#23CE68" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <h2 className="text-xl font-extrabold text-brand-dark mb-2">
                {success.org_name} is ready!
              </h2>
              <p className="text-text-muted text-sm mb-8">
                The HR admin account has been created. Share these credentials securely.
              </p>

              <div className="p-4 rounded-xl text-left mb-6" style={{ background: '#FFF6CF', border: '1px solid rgba(255,206,0,0.3)' }}>
                <p className="text-xs font-bold text-text-secondary mb-3 uppercase tracking-wider">HR Admin Login Credentials</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Email</span>
                    <span className="text-sm font-semibold text-brand-dark">{success.hr_email}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-text-muted">Temp Password</span>
                    <span className="text-sm font-mono font-bold text-brand-purple">{success.temp_password}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-text-muted mb-6">
                ⚠️ These credentials are shown once. Send them via SendGrid or copy them now.
              </p>

              <div className="flex gap-3 justify-center">
                <button onClick={() => setSuccess(null)} className="btn-outline">
                  Create Another
                </button>
                <Link href="/admin/organisations" className="btn-primary">
                  View Organisations
                </Link>
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Topbar title="New Organisation">
        <Link href="/admin/organisations" className="btn-outline text-sm">
          ← Back
        </Link>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6 flex justify-center">
        <div className="w-full max-w-[640px]">

          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium text-brand-red"
                 style={{ background: '#FFF3F3', border: '1px solid rgba(237,69,81,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-0">

            {/* Organisation details */}
            <div className="card">
              <div className="section-label">STEP 1</div>
              <div className="text-lg font-extrabold text-brand-dark mb-5">Organisation Details</div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="form-label">Organisation Name *</label>
                  <input
                    className="form-input"
                    placeholder="Acme Corporation"
                    value={form.org_name}
                    onChange={e => handleChange('org_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">URL Slug *</label>
                  <input
                    className="form-input"
                    placeholder="acme-corporation"
                    value={form.org_slug}
                    onChange={e => handleChange('org_slug', e.target.value)}
                    pattern="[a-z0-9-]+"
                    required
                  />
                  <p className="text-[11px] text-text-muted mt-1">Lowercase letters, numbers, hyphens only</p>
                </div>
                <div>
                  <label className="form-label">Email Domain</label>
                  <input
                    className="form-input"
                    placeholder="acme.com"
                    value={form.domain}
                    onChange={e => handleChange('domain', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Subscription Plan *</label>
                  <select
                    className="form-select"
                    value={form.plan}
                    onChange={e => handleChange('plan', e.target.value)}
                    required
                  >
                    {PLANS.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label">Brand Colour</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={form.primary_color}
                      onChange={e => handleChange('primary_color', e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                      style={{ background: 'transparent' }}
                    />
                    <input
                      className="form-input flex-1"
                      value={form.primary_color}
                      onChange={e => handleChange('primary_color', e.target.value)}
                      placeholder="#623CEA"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* HR Admin details */}
            <div className="card">
              <div className="section-label">STEP 2</div>
              <div className="text-lg font-extrabold text-brand-dark mb-1">HR Admin Account</div>
              <p className="text-sm text-text-muted mb-5">
                A login will be auto-generated. Credentials will be shown after creation to send via email.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Full Name *</label>
                  <input
                    className="form-input"
                    placeholder="Priya Sharma"
                    value={form.hr_name}
                    onChange={e => handleChange('hr_name', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Work Email *</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="priya@acme.com"
                    value={form.hr_email}
                    onChange={e => handleChange('hr_email', e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Job Title</label>
                  <input
                    className="form-input"
                    placeholder="L&D Manager"
                    value={form.hr_job_title}
                    onChange={e => handleChange('hr_job_title', e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">Department</label>
                  <input
                    className="form-input"
                    placeholder="Human Resources"
                    value={form.hr_department}
                    onChange={e => handleChange('hr_department', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-2">
              <Link href="/admin/organisations" className="btn-outline">Cancel</Link>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Creating…' : 'Create Organisation & HR Admin'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
