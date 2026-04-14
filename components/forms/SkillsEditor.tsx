'use client';

import { useState } from 'react';

interface SkillItem {
  id?: string;
  name: string;
  description: string;
  sort_order: number;
}

interface SkillsEditorProps {
  skills: SkillItem[];
  onChange: (skills: SkillItem[]) => void;
}

export default function SkillsEditor({ skills, onChange }: SkillsEditorProps) {
  const [editIdx, setEditIdx] = useState<number | null>(null);

  function addSkill() {
    const next = [...skills, { name: '', description: '', sort_order: skills.length }];
    onChange(next);
    setEditIdx(next.length - 1);
  }

  function removeSkill(index: number) {
    const next = skills.filter((_, i) => i !== index).map((s, i) => ({ ...s, sort_order: i }));
    onChange(next);
    setEditIdx(null);
  }

  function updateSkill(index: number, field: 'name' | 'description', value: string) {
    const next = skills.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange(next);
  }

  function moveSkill(index: number, direction: 'up' | 'down') {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === skills.length - 1) return;

    const next = [...skills];
    const swapIdx = direction === 'up' ? index - 1 : index + 1;
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
    onChange(next.map((s, i) => ({ ...s, sort_order: i })));
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <label className="form-label" style={{ marginBottom: 0 }}>Skill Areas</label>
        <button type="button" onClick={addSkill} className="btn-outline" style={{ padding: '5px 14px', fontSize: '12px' }}>
          + Add Skill
        </button>
      </div>

      {skills.length === 0 && (
        <div className="text-center py-6 text-sm text-text-muted rounded-xl" style={{ background: '#FAFAF7', border: '1.5px dashed rgba(34,29,35,0.12)' }}>
          No skills yet. Add at least one skill area for this programme.
        </div>
      )}

      <div className="space-y-2">
        {skills.map((skill, i) => (
          <div
            key={i}
            className="rounded-xl p-3.5 transition-all"
            style={{
              background: editIdx === i ? '#FFF6CF' : '#FAFAF7',
              border: `1.5px solid ${editIdx === i ? 'rgba(255,206,0,0.4)' : 'rgba(34,29,35,0.06)'}`,
            }}
          >
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-1 pt-1.5">
                <span className="text-[10px] font-bold text-text-muted">{String(i + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  onClick={() => moveSkill(i, 'up')}
                  disabled={i === 0}
                  className="text-text-muted hover:text-brand-dark disabled:opacity-20"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px' }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => moveSkill(i, 'down')}
                  disabled={i === skills.length - 1}
                  className="text-text-muted hover:text-brand-dark disabled:opacity-20"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px' }}
                >
                  ▼
                </button>
              </div>

              <div className="flex-1 space-y-2">
                <input
                  className="form-input"
                  placeholder="Skill name (e.g. Active Listening)"
                  value={skill.name}
                  onChange={e => updateSkill(i, 'name', e.target.value)}
                  onFocus={() => setEditIdx(i)}
                />
                {editIdx === i && (
                  <input
                    className="form-input"
                    placeholder="Brief description (optional)"
                    value={skill.description}
                    onChange={e => updateSkill(i, 'description', e.target.value)}
                  />
                )}
              </div>

              <button
                type="button"
                onClick={() => removeSkill(i)}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-red-50 transition-colors flex-shrink-0"
                style={{ background: 'none', border: 'none', cursor: 'pointer', marginTop: '4px' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ED4551" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
