'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

interface ResourceItem {
  id: string;
  title: string;
  type: string;
  file_url: string;
  duration_minutes: number | null;
  sort_order: number;
}

const TYPE_ICONS: Record<string, string> = { pdf: '📄', video: '🎬', link: '🔗', article: '📰' };

export default function CohortResourcesPage() {
  const params = useParams();
  const { toast } = useToast();
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cohortName, setCohortName] = useState('');

  const [title, setTitle] = useState('');
  const [type, setType] = useState('pdf');
  const [duration, setDuration] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState('');

  const fetchResources = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/cohorts/${params.id}/resources`);
    const data = await res.json();
    setResources(data.resources ?? []);

    const cohortRes = await fetch(`/api/cohorts/${params.id}`);
    const cohortData = await cohortRes.json();
    setCohortName(cohortData.cohort?.name ?? 'Cohort');
    setLoading(false);
  }, [params.id]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { toast.error('Title is required'); return; }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('type', type);
      if (duration) formData.append('duration_minutes', duration);

      if (file) {
        formData.append('file', file);
      } else if (fileUrl) {
        formData.append('file_url', fileUrl);
      }

      const res = await fetch(`/api/cohorts/${params.id}/resources`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success('Resource added!');
      setShowAdd(false);
      resetForm();
      fetchResources();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed');
    }
    setUploading(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/cohorts/${params.id}/resources?resource_id=${deleteId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Resource deleted');
      setDeleteId(null);
      fetchResources();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
    setDeleting(false);
  }

  function resetForm() {
    setTitle(''); setType('pdf'); setDuration(''); setFile(null); setFileUrl('');
  }

  return (
    <>
      <Topbar title={`Resources — ${cohortName}`}>
        <button onClick={() => setShowAdd(true)} className="btn-primary">+ Add Resource</button>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <Link href={`/hr/cohorts/${params.id}`} className="text-brand-purple text-sm font-semibold hover:opacity-70 transition-opacity mb-4 inline-block no-underline">
          ← Back to cohort
        </Link>

        <div className="section-label mb-1">PRE-READ RESOURCES</div>
        <p className="text-sm text-text-muted mb-4">{resources.length} resources uploaded</p>

        {loading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-16 w-full" />)}</div>
        ) : resources.length === 0 ? (
          <div className="card text-center py-10">
            <div className="text-3xl mb-3">📚</div>
            <p className="text-sm text-text-muted mb-3">No resources yet. Upload pre-reads for participants.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">Upload Resource</button>
          </div>
        ) : (
          <div className="space-y-2">
            {resources.map(r => (
              <div key={r.id} className="card flex items-center gap-4" style={{ padding: '14px 18px', marginBottom: '8px' }}>
                <span className="text-xl">{TYPE_ICONS[r.type] ?? '📄'}</span>
                <div className="flex-1">
                  <div className="text-sm font-bold text-brand-dark">{r.title}</div>
                  <div className="text-xs text-text-muted">
                    {r.type.toUpperCase()}{r.duration_minutes ? ` · ${r.duration_minutes} min` : ''}
                  </div>
                </div>
                {r.file_url && (
                  <a href={r.file_url} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: '5px 12px', fontSize: '11px' }}>
                    Open ↗
                  </a>
                )}
                <button
                  onClick={() => setDeleteId(r.id)}
                  className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ED4551" strokeWidth="2" strokeLinecap="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Resource Modal */}
      <Modal open={showAdd} onClose={() => { setShowAdd(false); resetForm(); }} title="Add Resource" size="md" footer={
        <>
          <button onClick={() => { setShowAdd(false); resetForm(); }} className="btn-outline">Cancel</button>
          <button onClick={handleUpload} disabled={uploading} className="btn-primary">
            {uploading ? 'Uploading…' : 'Add Resource'}
          </button>
        </>
      }>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="e.g. Leadership Foundations Guide" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Type</label>
              <select className="form-select" value={type} onChange={e => setType(e.target.value)}>
                <option value="pdf">PDF</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
                <option value="article">Article</option>
              </select>
            </div>
            <div>
              <label className="form-label">Duration (minutes)</label>
              <input type="number" className="form-input" placeholder="12" value={duration} onChange={e => setDuration(e.target.value)} />
            </div>
          </div>

          {(type === 'link' || type === 'article') ? (
            <div>
              <label className="form-label">URL</label>
              <input className="form-input" type="url" placeholder="https://…" value={fileUrl} onChange={e => setFileUrl(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="form-label">Upload File</label>
              <div
                className="rounded-xl p-6 text-center cursor-pointer transition-all"
                style={{ border: '2px dashed rgba(34,29,35,0.15)', background: '#FFFDF5' }}
                onClick={() => document.getElementById('res-file-input')?.click()}
              >
                <input
                  id="res-file-input"
                  type="file"
                  accept=".pdf,.mp4,.mov,.webm"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <p className="text-sm font-semibold text-brand-dark">{file.name}</p>
                ) : (
                  <p className="text-sm text-text-muted">Click to select a file (PDF, MP4)</p>
                )}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Resource?"
        description="This will permanently remove the resource and its file."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
