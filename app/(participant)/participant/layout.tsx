import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';

const NAV_ITEMS = [
  { href: '/participant/pre-training', label: 'Pre-Training',   icon: <CheckIcon /> },
  { href: '/participant/training-day', label: 'Training Day',   icon: <CalIcon /> },
  { href: '/participant/progress',     label: 'My Progress',    icon: <TrendIcon /> },
  { href: '/participant/community',    label: 'Community',      icon: <GlobeIcon /> },
];

export default async function ParticipantLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user || user.role !== 'participant') {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FFFDF5' }}>
      <Sidebar
        user={user}
        navItems={NAV_ITEMS}
        roleLabel="Participant"
        roleColor="#623CEA"
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function CheckIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>; }
function CalIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function TrendIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>; }
function GlobeIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
