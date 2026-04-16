'use client';

import { useState, useEffect } from 'react';

interface Programme {
  id: string;
  name: string;
}

interface Trainer {
  user_id: string;
  users: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  job_title: string | null;
}

interface Candidate {
  user_id: string;
  users: {
    id: string;
    name: string;
    email: string;
    avatar_url: string | null;
  };
  job_title: string | null;
}

interface CohortFormData {
  programme_id: string;
  name: string;
  trainer_user_id: string;
  training_date: string;
  training_time: string;
  location: string;
  max_participants: number;
  candidate_user_ids: string[];
}

interface CohortFormProps {
  onSubmit: (data: CohortFormData) => Promise<void>;
  loading?: boolean;
}

export default function CohortForm({ onSubmit, loading = false }: CohortFormProps) {
  const [step, setStep] = useState(1);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [programmeId, setProgrammeId] = useState('');
  const [name, setName] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [trainingDate, setTrainingDate] = useState('');
  const [trainingTime, setTrainingTime] = useState('09:00');
  const [location, setLocation] = useState('Virtual');
  const [maxParticipants, setMaxParticipants] = useState(30);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateIds, setCandidateIds] = useState<string[]>([]);

  useEffect(() => {
    fetch('/api/programmes').then(r => r.json()).then(d => setProgrammes(d.programmes ?? [])).catch(() => {});
    fetch('/api/auth/create-user?role=trainer').then(r => r.json()).then(d => setTrainers(d.users ?? [])).catch(() => {});
    fetch('/api/auth/create-user?role=participant').then(r => r.json()).then(d => setCandidates(d.users ?? [])).catch(() => {});
  }, []);

  const selectedProgramme = programmes.find(p => p.id === programmeId);
  const selectedTrainer = trainers.find(t => t.user_id === trainerId);
  const selectedCandidates = candidates.filter(c => candidateIds.includes(c.user_id));

  const filteredCandidates = candidates.filter(c => {
    const q = candidateSearch.trim().toLowerCase();
    if (!q) return true;
    const name = c.users?.name ?? '';
    const email = c.users?.email ?? '';
    return name.toLowerCase().includes(q) || email.toLowerCase().includes(q);
  });

  function handleNext() {
    setError(null);
    if (step === 1) {
      if (!programmeId) { setError('Select a programme'); return; }
      if (!name.trim()) { setError('Cohort name is required'); return; }
      if (!trainingDate) { setError('Training date is required'); return; }
      setStep(2);
    } else if (step === 2) {
      if (!trainerId) { setError('Select a trainer'); return; }
      setStep(3);
    } else if (step === 3) {
      if (candidateIds.length > maxParticipants) {
        setError(`You selected ${candidateIds.length} candidates but max participants is ${maxParticipants}`);
        return;
      }
      setStep(4);
    }
  }

  async function handleSubmit() {
    setError(null);
    try {
      await onSubmit({
        programme_id: programmeId,
        name: name.trim(),
        trainer_user_id: trainerId,
        training_date: trainingDate,
        training_time: trainingTime,
        location: location.trim(),
        max_participants: maxParticipants,
        candidate_user_ids: candidateIds,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        {[1, 2, 3, 4].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={{
                background: step >= s ? '#FFCE00' : 'rgba(34,29,35,0.08)',
                color: step >= s ? '#221D23' : '#8A8090',
              }}
            >
              {step > s ? '✓' : s}
            </div>
            <span className="text-xs font-semibold" style={{ color: step >= s ? '#221D23' : '#8A8090' }}>
              {s === 1 ? 'Details' : s === 2 ? 'Trainer' : s === 3 ? 'Candidates' : 'Review'}
            </span>
            {s < 4 && (
              <div className="w-12 h-0.5 rounded-full" style={{ background: step > s ? '#FFCE00' : 'rgba(34,29,35,0.1)' }} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl text-sm text-brand-red mb-4" style={{ background: '#FFF3F3' }}>
          {error}
        </div>
      )}

      {/* Step 1: Details */}
      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label className="form-label">Programme *</label>
            <select className="form-select" value={programmeId} onChange={e => { setProgrammeId(e.target.value); const p = programmes.find(p => p.id === e.target.value); if (p && !name) setName(`${p.name} — Batch`); }}>
              <option value="">Select a programme…</option>
              {programmes.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Cohort Name *</label>
            <input className="form-input" placeholder="e.g. People Leadership — Batch 4 Mumbai" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Training Date *</label>
              <input type="date" className="form-input" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Training Time</label>
              <input type="time" className="form-input" value={trainingTime} onChange={e => setTrainingTime(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Location</label>
              <input className="form-input" placeholder="Virtual" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
            <div>
              <label className="form-label">Max Participants</label>
              <input type="number" className="form-input" min={1} max={500} value={maxParticipants} onChange={e => setMaxParticipants(parseInt(e.target.value) || 30)} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Trainer */}
      {step === 2 && (
        <div>
          <div className="section-label mb-1">ASSIGN TRAINER</div>
          <p className="text-sm text-text-muted mb-4">Select a trainer for this cohort.</p>

          {trainers.length === 0 ? (
            <div className="text-center py-8 text-sm text-text-muted rounded-xl" style={{ background: '#FAFAF7' }}>
              No trainers found. Create a trainer first.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {trainers.map(t => (
                <button
                  key={t.user_id}
                  type="button"
                  onClick={() => setTrainerId(t.user_id)}
                  className="rounded-xl p-4 text-left transition-all"
                  style={{
                    background: trainerId === t.user_id ? '#FFF6CF' : '#fff',
                    border: `2px solid ${trainerId === t.user_id ? '#FFCE00' : 'rgba(34,29,35,0.08)'}`,
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="avatar" style={{ background: '#3699FC' }}>
                      {t.users?.name?.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <div className="font-bold text-sm text-brand-dark">{t.users?.name}</div>
                      <div className="text-xs text-text-muted">{t.job_title ?? t.users?.email}</div>
                    </div>
                    {trainerId === t.user_id && (
                      <div className="ml-auto w-6 h-6 rounded-full bg-brand-yellow flex items-center justify-center">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#221D23" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Candidates */}
      {step === 3 && (
        <div>
          <div className="section-label mb-1">SELECT CANDIDATES</div>
          <p className="text-sm text-text-muted mb-4">
            Choose participants to nominate for this cohort. Selected: <span className="font-semibold text-brand-dark">{candidateIds.length}</span>
          </p>

          {candidates.length === 0 ? (
            <div className="text-center py-8 text-sm text-text-muted rounded-xl" style={{ background: '#FAFAF7' }}>
              No participants found. Create participants first.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-3">
                <input
                  className="form-input"
                  placeholder="Search participants…"
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => {
                    const ids = filteredCandidates.map(c => c.user_id);
                    const allSelected = ids.every(id => candidateIds.includes(id));
                    setCandidateIds(allSelected ? candidateIds.filter(id => !ids.includes(id)) : Array.from(new Set([...candidateIds, ...ids])));
                  }}
                >
                  {filteredCandidates.length > 0 && filteredCandidates.every(c => candidateIds.includes(c.user_id)) ? 'Clear' : 'Select'} shown
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {filteredCandidates.map(c => {
                  const selected = candidateIds.includes(c.user_id);
                  return (
                    <button
                      key={c.user_id}
                      type="button"
                      onClick={() => setCandidateIds(prev => selected ? prev.filter(id => id !== c.user_id) : [...prev, c.user_id])}
                      className="rounded-xl p-4 text-left transition-all"
                      style={{
                        background: selected ? '#FFF6CF' : '#fff',
                        border: `2px solid ${selected ? '#FFCE00' : 'rgba(34,29,35,0.08)'}`,
                        cursor: 'pointer',
                        fontFamily: 'Inter, sans-serif',
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="avatar" style={{ background: '#623CEA' }}>
                          {c.users?.name?.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <div className="font-bold text-sm text-brand-dark">{c.users?.name}</div>
                          <div className="text-xs text-text-muted">{c.job_title ?? c.users?.email}</div>
                        </div>
                        {selected && (
                          <div className="ml-auto w-6 h-6 rounded-full bg-brand-yellow flex items-center justify-center">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#221D23" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div>
          <div className="section-label mb-1">REVIEW</div>
          <p className="text-sm text-text-muted mb-4">Confirm cohort details before creating.</p>

          <div className="card" style={{ background: '#FAFAF7' }}>
            <div className="space-y-3">
              {[
                { label: 'Programme', value: selectedProgramme?.name ?? '—' },
                { label: 'Cohort Name', value: name },
                { label: 'Trainer', value: selectedTrainer?.users?.name ?? '—' },
                { label: 'Candidates selected', value: String(candidateIds.length) },
                { label: 'Training Date', value: trainingDate ? new Date(trainingDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                { label: 'Time', value: trainingTime },
                { label: 'Location', value: location || 'Virtual' },
                { label: 'Max Participants', value: String(maxParticipants) },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1.5" style={{ borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}>
                  <span className="text-xs text-text-muted">{item.label}</span>
                  <span className="text-sm font-semibold text-brand-dark">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {selectedCandidates.length > 0 && (
            <div className="mt-4">
              <div className="section-label mb-2">NOMINATED</div>
              <div className="card" style={{ background: '#fff' }}>
                <div className="flex flex-wrap gap-2">
                  {selectedCandidates.slice(0, 12).map(c => (
                    <span key={c.user_id} className="tag" style={{ background: 'rgba(34,29,35,0.06)', color: '#221D23' }}>
                      {c.users?.name}
                    </span>
                  ))}
                  {selectedCandidates.length > 12 && (
                    <span className="text-xs text-text-muted">+{selectedCandidates.length - 12} more</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-6">
        {step > 1 && (
          <button type="button" onClick={() => setStep(s => s - 1)} className="btn-outline">
            ← Back
          </button>
        )}
        <div className="flex-1" />
        {step < 4 ? (
          <button type="button" onClick={handleNext} className="btn-primary">
            Continue →
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? 'Creating…' : 'Create Cohort'}
          </button>
        )}
      </div>
    </div>
  );
}
