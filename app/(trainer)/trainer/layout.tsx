import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/supabase/server';
import Sidebar from '@/components/layout/Sidebar';

const NAV_ITEMS = [
  { href: '/trainer/overview',       label: 'My Cohorts',     icon: <GridIcon /> },
  { href: '/trainer/participants',   label: 'Participants',   icon: <UsersIcon /> },
  { href: '/trainer/messages',       label: 'Messages',       icon: <MessageIcon /> },
  { href: '/trainer/nudges',         label: 'Nudges',         icon: <ZapIcon /> },
  { href: '/trainer/community',      label: 'Community',      icon: <GlobeIcon /> },
];

export default async function TrainerLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  if (!user || user.role !== 'trainer') {
    redirect('/login');
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#FFFDF5' }}>
      <Sidebar
        user={user}
        navItems={NAV_ITEMS}
        roleLabel="Trainer"
        roleColor="#3699FC"
      />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function GridIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>; }
function UsersIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>; }
function MessageIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>; }
function ZapIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>; }
function GlobeIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>; }
