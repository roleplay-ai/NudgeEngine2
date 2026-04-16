'use client';

import { useState } from 'react';

interface SkillItem {
  id?: string;
  name: string;
  description: string;
  sort_order: number;
}

interface ProgrammeFormData {
  name: string;
  description: string;
}

interface ProgrammeFormProps {
  initialData?: Partial<ProgrammeFormData>;
  onSubmit: (data: ProgrammeFormData) => Promise<void>;
  submitLabel?: string;
  loading?: boolean;
}

export default function ProgrammeForm({
  initialData,
  onSubmit,
  submitLabel = 'Save Programme',
  loading = false,
}: ProgrammeFormProps) {
  const [name, setName] = useState(initialData?.name ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Programme name is required');
      return;
    }

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim(),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-brand-red" style={{ background: '#FFF3F3' }}>
          {error}
        </div>
      )}

      <div>
        <div className="section-label">PROGRAMME DETAILS</div>
        <div className="section-title mb-4">Programme Information</div>

        <div className="space-y-4">
          <div>
            <label className="form-label">Programme Name *</label>
            <input
              className="form-input"
              placeholder="e.g. People Leadership Programme"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              placeholder="What is this programme about? What will participants learn?"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          {/* Strategy pillars intentionally removed from the HR programme creation flow */}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2" style={{ borderTop: '1px solid rgba(34,29,35,0.08)', paddingTop: '16px' }}>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
