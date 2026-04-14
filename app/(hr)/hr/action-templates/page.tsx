'use client';

import { useState, useEffect, useCallback } from 'react';
import Topbar from '@/components/layout/Topbar';
import Modal from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';

interface Template {
  id: string;
  title: string;
  category: string | null;
  skill_id: string | null;
  builds_capability: string | null;
  created_at: string;
  skills: { id: string; name: string } | null;
}

interface Skill {
  id: string;
  name: string;
  programme_id: string;
}

export default function ActionTemplatesPage() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterSkill, setFilterSkill] = useState('');

  const [form, setForm] = useState({ title: '', category: '', skill_id: '', builds_capability: '' });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [tRes, pRes] = await Promise.all([
      fetch('/api/action-templates'),
      fetch('/api/programmes?include_cohorts=false'),
    ]);
    const tData = await tRes.json();
    const pData = await pRes.json();

    setTemplates(tData.templates ?? []);

    const allSkills: Skill[] = [];
    for (const p of (pData.programmes ?? [])) {
      for (const s of (p.skills ?? [])) {
        allSkills.push({ ...s, programme_id: p.id });
      }
    }
    setSkills(allSkills);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  function openCreate() {
    setEditId(null);
    setForm({ title: '', category: '', skill_id: '', builds_capability: '' });
    setShowModal(true);
  }

  function openEdit(t: Template) {
    setEditId(t.id);
    setForm({
      title: t.title,
      category: t.category ?? '',
      skill_id: t.skill_id ?? '',
      builds_capability: t.builds_capability ?? '',
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setSaving(true);
    try {
      const url = editId ? `/api/action-templates/${editId}` : '/api/action-templates';
      const method = editId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category.trim() || null,
          skill_id: form.skill_id || null,
          builds_capability: form.builds_capability.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(editId ? 'Template updated!' : 'Template created!');
      setShowModal(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/action-templates/${deleteId}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error); }
      toast.success('Template deleted');
      setDeleteId(null);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed');
    }
    setDeleting(false);
  }

  const filtered = templates.filter(t => !filterSkill || t.skill_id === filterSkill);
  const uniqueSkills = [...new Map(skills.map(s => [s.id, s])).values()];

  return (
    <>
      <Topbar title="Action Library">
        <button onClick={openCreate} className="btn-primary">+ New Template</button>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        <div className="section-label">LIBRARY</div>
        <div className="section-title mb-4">Action Templates</div>

        {/* Skill filter pills */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <button
            onClick={() => setFilterSkill('')}
            className={`tab-btn ${!filterSkill ? 'active' : ''}`}
          >
            All
          </button>
          {uniqueSkills.map(s => (
            <button
              key={s.id}
              onClick={() => setFilterSkill(s.id)}
              className={`tab-btn ${filterSkill === s.id ? 'active' : ''}`}
            >
              {s.name}
            </button>
          ))}
        </div>

        <div className="data-table">
          <div
            className="grid px-5"
            style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 100px', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
          >
            {['Title', 'Category', 'Skill', 'Builds', 'Actions'].map(h => (
              <div key={h} className="th">{h}</div>
            ))}
          </div>

          {loading ? (
            <div className="px-5 py-8 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">
              No templates yet.{' '}
              <button onClick={openCreate} className="text-brand-purple font-semibold bg-transparent border-0 cursor-pointer">Create one →</button>
            </div>
          ) : (
            filtered.map(t => (
              <div
                key={t.id}
                className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors"
                style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 100px', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
              >
                <div className="td font-bold text-sm text-brand-dark">{t.title}</div>
                <div className="td text-text-muted text-xs">{t.category ?? '—'}</div>
                <div className="td">
                  {t.skills ? (
                    <span className="tag tag-orange">{t.skills.name}</span>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </div>
                <div className="td text-text-muted text-xs">{t.builds_capability ?? '—'}</div>
                <div className="td flex items-center gap-2">
                  <button
                    onClick={() => openEdit(t)}
                    className="text-xs font-bold text-brand-purple hover:opacity-70 bg-transparent border-0 cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleteId(t.id)}
                    className="text-xs font-bold text-brand-red hover:opacity-70 bg-transparent border-0 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Create/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editId ? 'Edit Action Template' : 'New Action Template'}
        footer={
          <>
            <button onClick={() => setShowModal(false)} className="btn-outline">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Saving…' : editId ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="form-label">Title *</label>
            <input className="form-input" placeholder="e.g. Have a feedback conversation" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Category</label>
            <input className="form-input" placeholder="e.g. Communication" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          </div>
          <div>
            <label className="form-label">Skill</label>
            <select className="form-select" value={form.skill_id} onChange={e => setForm(f => ({ ...f, skill_id: e.target.value }))}>
              <option value="">No skill linked</option>
              {uniqueSkills.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Builds Capability</label>
            <input className="form-input" placeholder="e.g. Active Listening" value={form.builds_capability} onChange={e => setForm(f => ({ ...f, builds_capability: e.target.value }))} />
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Template?"
        description="This cannot be undone. The template will be permanently removed."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </>
  );
}
