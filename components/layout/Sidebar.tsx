'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { SessionUser } from '@/types';

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ReactNode;
  phase?: string;
}

interface SidebarProps {
  user:    SessionUser;
  navItems: NavItem[];
  roleLabel: string;
  roleColor?: string;
}

export default function Sidebar({ user, navItems, roleLabel, roleColor = '#623CEA' }: SidebarProps) {
  const pathname  = usePathname();
  const router    = useRouter();
  const supabase  = createClient();
  const [showRole, setShowRole] = useState(false);

  const initials = user.name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <aside
      className="flex flex-col flex-shrink-0 relative"
      style={{
        width: '224px',
        background: '#221D23',
        boxShadow: '4px 0 24px rgba(0,0,0,0.18)',
      }}
    >
      {/* ── Logo ──────────────────────────────────────────────── */}
      <div className="px-[18px] py-[22px]" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="text-[11px] font-extrabold tracking-[3px] uppercase" style={{ color: '#FFCE00' }}>
          NUDGEABLE
        </div>
        <div className="text-[11px] mt-[3px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {roleLabel}
        </div>
      </div>

      {/* ── Nav items ─────────────────────────────────────────── */}
      <nav className="sidebar-nav flex-1 overflow-y-auto py-2.5">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 px-[18px] py-[9px] text-[13px] font-medium transition-all duration-150 whitespace-nowrap no-underline"
              style={{
                color:           active ? '#fff' : 'rgba(255,255,255,0.5)',
                background:      active ? 'rgba(255,206,0,0.08)' : 'transparent',
                borderLeft:      `3px solid ${active ? '#FFCE00' : 'transparent'}`,
              }}
            >
              <span
                className="w-7 h-7 rounded-[9px] flex items-center justify-center flex-shrink-0 transition-transform duration-150"
                style={{
                  background: active ? 'rgba(255,206,0,0.15)' : 'rgba(255,255,255,0.06)',
                  transform:  active ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: User + Logout ──────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        {/* Role popup */}
        {showRole && (
          <div
            className="absolute bottom-[64px] left-3 right-3 rounded-[14px] overflow-hidden z-50"
            style={{
              background: '#2A242E',
              border: '0.5px solid rgba(255,255,255,0.12)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div className="px-3.5 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
              Signed in as
            </div>
            <div className="px-3.5 py-2.5">
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>{user.email}</p>
              <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#FFCE00' }}>
                {user.role.toUpperCase()} · {user.company_name}
              </p>
            </div>
            <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium transition-colors duration-100 text-left"
                style={{ color: 'rgba(255,255,255,0.6)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}
              >
                <SignOutIcon /> Sign out
              </button>
            </div>
          </div>
        )}

        {/* User button */}
        <button
          onClick={() => setShowRole(v => !v)}
          className="flex items-center gap-2.5 w-full px-[18px] py-3 transition-colors duration-150 text-left"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter, sans-serif', fontSize: '13px' }}
        >
          <span
            className="rounded-full flex items-center justify-center font-extrabold flex-shrink-0 text-[10px] text-white"
            style={{
              width: '30px', height: '30px',
              background: roleColor,
              boxShadow: '0 0 0 2px rgba(255,255,255,0.12)',
            }}
          >
            {initials}
          </span>
          <span className="flex-1 truncate">{user.name}</span>
          <ChevronIcon />
        </button>
      </div>
    </aside>
  );
}

// ─── Inline SVG icons ─────────────────────────────────────────────────────────
function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15"/>
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
      <polyline points="16 17 21 12 16 7"/>
      <line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  );
}
