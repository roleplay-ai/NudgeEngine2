'use client';

import Link from 'next/link';

interface BuddyUser {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface BuddyCardProps {
  buddy: BuddyUser;
  cohortId: string;
}

function initials(name: string) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function BuddyCard({ buddy, cohortId: _cohortId }: BuddyCardProps) {
  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {buddy.avatar_url ? (
          <img src={buddy.avatar_url} alt={buddy.name} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: 'var(--purple)' }}
          >
            {initials(buddy.name)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-brand-dark text-sm">{buddy.name}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{buddy.email}</p>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1"
            style={{ background: 'rgba(98,60,234,0.1)', color: 'var(--purple)' }}
          >
            🤝 Your buddy
          </span>
        </div>
        <Link
          href={`mailto:${buddy.email}`}
          className="text-xs font-semibold px-3 py-1.5 rounded-full no-underline"
          style={{ background: 'var(--yellow)', color: 'var(--dark)' }}
        >
          Say hi →
        </Link>
      </div>
    </div>
  );
}
