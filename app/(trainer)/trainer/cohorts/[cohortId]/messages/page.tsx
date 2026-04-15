'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import MessageComposer from '@/components/trainer/MessageComposer';

interface Message {
  id: string;
  content: string;
  is_batch: boolean;
  sender_id: string;
  recipient_id: string | null;
  created_at: string;
  users: { id: string; name: string; avatar_url: string | null };
}

export default function TrainerMessagesPage() {
  const params = useParams();
  const cohortId = params.cohortId as string;

  const [tab, setTab] = useState<'batch' | 'direct'>('batch');
  const [batchMessages, setBatchMessages] = useState<Message[]>([]);
  const [directMessages, setDirectMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages?cohort_id=${cohortId}`);
    if (res.ok) {
      const data = await res.json();
      setBatchMessages(data.batch_messages ?? []);
      setDirectMessages(data.direct_messages ?? []);
    }
    setLoading(false);
  }, [cohortId]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  return (
    <main className="flex-1 overflow-y-auto px-7 py-6">
      <Link href={`/trainer/cohorts/${cohortId}`} className="text-xs text-text-muted hover:text-brand-dark transition-colors mb-3 inline-block">
        ← Back to Cohort
      </Link>

      <div className="section-label">COMMUNICATION</div>
      <h1 className="section-title mb-5">Messages</h1>

      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-5" style={{ borderBottom: '1px solid rgba(34,29,35,0.08)' }}>
        {(['batch', 'direct'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              color: tab === t ? '#221D23' : '#8A8090',
              borderBottom: tab === t ? '2px solid #221D23' : '2px solid transparent',
              background: 'none',
            }}
          >
            {t === 'batch' ? 'Batch Messages' : 'Direct Messages'}
            {t === 'batch' && batchMessages.length > 0 && (
              <span className="ml-1.5 text-[10px] bg-brand-dark text-white rounded-full px-1.5 py-0.5">
                {batchMessages.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card py-12 text-center"><p className="text-text-muted">Loading messages...</p></div>
      ) : (
        <div className="grid grid-cols-1 gap-5" style={{ maxWidth: 680 }}>
          {/* Composer */}
          <MessageComposer cohortId={cohortId} isBatch={tab === 'batch'} onSent={loadMessages} />

          {/* Messages list */}
          {tab === 'batch' && (
            <div className="space-y-3">
              {batchMessages.length === 0 && (
                <div className="card py-8 text-center" style={{ marginBottom: 0 }}>
                  <p className="text-text-muted text-sm">No batch messages yet. Send one above!</p>
                </div>
              )}
              {batchMessages.map(msg => (
                <div key={msg.id} className="card" style={{ marginBottom: 0 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="avatar avatar-sm" style={{ background: '#3699FC' }}>
                      {msg.users?.name?.slice(0, 2).toUpperCase() ?? 'TR'}
                    </div>
                    <span className="text-sm font-semibold text-brand-dark">{msg.users?.name ?? 'Trainer'}</span>
                    <span className="text-[10px] text-text-muted ml-auto">
                      {new Date(msg.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'direct' && (
            <div className="space-y-3">
              {directMessages.length === 0 && (
                <div className="card py-8 text-center" style={{ marginBottom: 0 }}>
                  <p className="text-text-muted text-sm">No direct messages yet.</p>
                </div>
              )}
              {directMessages.map(msg => (
                <div key={msg.id} className="card" style={{ marginBottom: 0 }}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="avatar avatar-sm">
                      {msg.users?.name?.slice(0, 2).toUpperCase() ?? '??'}
                    </div>
                    <span className="text-sm font-semibold text-brand-dark">{msg.users?.name}</span>
                    <span className="text-[10px] text-text-muted ml-auto">
                      {new Date(msg.created_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary leading-relaxed">{msg.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
