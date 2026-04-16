'use client';

interface Props {
  cohortId: string;
  preConfirmed: boolean;
  liveCheckin: boolean;
  isTrainingDay: boolean;
  onUpdate: () => void;
}

export default function AttendanceConfirm({
  cohortId,
  preConfirmed,
  liveCheckin,
  isTrainingDay,
  onUpdate,
}: Props) {
  async function confirmRsvp() {
    await fetch('/api/attendance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort_id: cohortId, pre_confirmed: true }),
    });
    onUpdate();
  }

  async function checkIn() {
    await fetch('/api/attendance/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort_id: cohortId }),
    });
    onUpdate();
  }

  if (liveCheckin) {
    return (
      <div className="card" style={{ background: '#F0FFF7', border: '1px solid rgba(35,206,104,0.25)', marginBottom: 0 }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-bold text-brand-dark">You&apos;re checked in</div>
            <div className="text-xs text-text-muted">Thanks for confirming your attendance today.</div>
          </div>
        </div>
      </div>
    );
  }

  if (isTrainingDay) {
    return (
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="section-label mb-2">CHECK IN</div>
        <p className="text-sm text-text-secondary mb-4">
          Tap below to confirm you&apos;re here for today&apos;s session.
        </p>
        <button type="button" className="btn-primary w-full justify-center" style={{ height: 48 }} onClick={checkIn}>
          Check In Now
        </button>
      </div>
    );
  }

  if (preConfirmed) {
    return (
      <div className="card" style={{ background: '#F0FFF7', border: '1px solid rgba(35,206,104,0.25)', marginBottom: 0 }}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-bold text-brand-dark">You&apos;re confirmed</div>
            <div className="text-xs text-text-muted">We&apos;ll see you on training day. You can check in from this page on the morning of the session.</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="section-label mb-2">ATTENDANCE</div>
      <p className="text-sm text-text-secondary mb-4">
        Will you attend this training session?
      </p>
      <button type="button" className="btn-primary w-full justify-center" onClick={confirmRsvp}>
        Confirm I&apos;ll attend
      </button>
    </div>
  );
}
