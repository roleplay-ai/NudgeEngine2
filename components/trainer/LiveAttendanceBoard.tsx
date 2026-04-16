'use client';

interface ParticipantRow {
  user: { id: string; name: string; email: string; avatar_url: string | null };
  attendance: {
    pre_confirmed: boolean;
    live_checkin: boolean;
  };
}

interface Props {
  participants: ParticipantRow[];
}

export default function LiveAttendanceBoard({ participants }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {participants.map(p => {
        const initials = p.user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const checked = p.attendance.live_checkin;
        const pre = p.attendance.pre_confirmed;

        let ring = 'rgba(34,29,35,0.08)';
        let glow = 'transparent';
        if (checked) {
          ring = 'rgba(35,206,104,0.5)';
          glow = '0 0 20px rgba(35,206,104,0.35)';
        } else if (pre) {
          ring = 'rgba(255,206,0,0.6)';
          glow = '0 0 16px rgba(255,206,0,0.25)';
        }

        return (
          <div
            key={p.user.id}
            className="card text-center transition-all"
            style={{
              marginBottom: 0,
              border: `2px solid ${ring}`,
              boxShadow: glow,
            }}
          >
            <div className="avatar avatar-lg mx-auto mb-2" style={{ background: '#3699FC' }}>
              {initials}
            </div>
            <div className="text-sm font-bold text-brand-dark truncate">{p.user.name}</div>
            <div className="text-[10px] text-text-muted mt-1">
              {checked ? '✓ Checked in' : pre ? 'RSVP yes' : 'Not yet'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
