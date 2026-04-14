'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createClient();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  // Show error from middleware redirects
  useEffect(() => {
    const err = params.get('error');
    if (err === 'no_role') setError('Your account has not been assigned to an organisation. Please contact HR.');
  }, [params]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Invalid email or password. Please check your credentials.');
      setLoading(false);
      return;
    }

    // Middleware will handle role-based redirect after session is set
    const next = params.get('next') ?? '/';
    router.push(next);
    router.refresh();
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#FFFDF5' }}>

      {/* ── Left Panel ────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[440px] flex-shrink-0 p-12"
        style={{ background: '#221D23' }}
      >
        {/* Logo */}
        <div>
          <div className="text-[11px] font-extrabold tracking-[3px] text-brand-yellow uppercase mb-1">
            NUDGEABLE
          </div>
          <div className="text-[11px] text-white/40">.ai</div>
        </div>

        {/* Hero text */}
        <div>
          <div className="inline-flex items-center gap-2 bg-brand-yellow/10 border border-brand-yellow/20 rounded-full px-3 py-1 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-yellow animate-pulse" />
            <span className="text-xs font-semibold text-brand-yellow">L&amp;D Platform</span>
          </div>

          <h1 className="text-4xl font-black text-white leading-tight mb-4">
            Transform training into
            <span className="text-brand-yellow"> lasting change.</span>
          </h1>

          <p className="text-white/50 text-[15px] leading-relaxed mb-10">
            From pre-training readiness to post-training action tracking —
            Nudgeable turns one-time events into continuous skill journeys.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { num: '4x',  label: 'Skill retention boost' },
              { num: '87%', label: 'Action completion rate' },
              { num: '3×',  label: 'ROI on training spend' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="text-2xl font-black text-brand-yellow">{s.num}</div>
                <div className="text-[11px] text-white/40 mt-1 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="text-[11px] text-white/20">
          © 2026 Nudgeable.ai · All rights reserved
        </div>
      </div>

      {/* ── Right Panel (Login Form) ───────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-[400px]">

          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <span className="text-[11px] font-extrabold tracking-[3px] text-brand-dark uppercase">NUDGEABLE</span>
            <span className="text-[11px] text-text-muted">.ai</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-brand-dark mb-1">Welcome back</h2>
            <p className="text-text-muted text-sm">
              Sign in with the credentials shared by your HR team.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium text-brand-red"
                 style={{ background: '#FFF3F3', border: '1px solid rgba(237,69,81,0.2)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="form-label">Email address</label>
              <input
                type="email"
                className="form-input"
                placeholder="you@company.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input pr-12"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-brand-dark transition-colors"
                >
                  {showPass ? (
                    <EyeOffIcon />
                  ) : (
                    <EyeIcon />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2 justify-center"
              style={{ height: '48px' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Spinner /> Signing in…
                </span>
              ) : 'Sign in'}
            </button>
          </form>

          {/* Info note - no self-signup */}
          <div className="mt-8 p-4 rounded-xl" style={{ background: 'rgba(34,29,35,0.04)', border: '1px solid rgba(34,29,35,0.07)' }}>
            <div className="flex items-start gap-3">
              <InfoIcon />
              <div>
                <p className="text-xs font-semibold text-brand-dark mb-0.5">Don&apos;t have an account?</p>
                <p className="text-xs text-text-muted leading-relaxed">
                  Accounts are created by your HR team. Check your email for login credentials,
                  or contact your L&amp;D administrator.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ─── Micro-icons ───────────────────────────────────────────────────────────────
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8090" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
