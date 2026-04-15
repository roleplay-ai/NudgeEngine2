'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  cohortId: string;
  isBatch: boolean;
  recipientId?: string;
  onSent?: () => void;
}

export default function MessageComposer({ cohortId, isBatch, recipientId, onSent }: Props) {
  const [content, setContent] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  async function handleSend() {
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cohort_id: cohortId,
          content: content.trim(),
          is_batch: isBatch,
          recipient_id: isBatch ? null : recipientId,
        }),
      });

      if (res.ok) {
        setContent('');
        onSent?.();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 0, background: 'rgba(34,29,35,0.02)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-text-muted">
          To: {isBatch ? 'All Participants' : 'Direct Message'}
        </span>
      </div>
      <textarea
        ref={textareaRef}
        className="w-full rounded-xl border px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        style={{ borderColor: 'rgba(34,29,35,0.12)', minHeight: 60, maxHeight: 200 }}
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder={isBatch ? 'Send a message to all participants...' : 'Type your message...'}
      />
      <div className="flex items-center justify-end mt-2">
        <button
          className="btn-primary text-xs px-5"
          onClick={handleSend}
          disabled={!content.trim() || sending}
        >
          {sending ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
