interface Props {
  name: string;
  avatarUrl?: string | null;
  role?: string | null;
  team?: string | null;
  message?: string | null;
  isMe?: boolean;
}

export default function IntroCard({ name, role, team, message, isMe }: Props) {
  const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div
      className="card transition-all"
      style={{
        marginBottom: 0,
        border: isMe ? '2px solid #FFCE00' : '1px solid rgba(34,29,35,0.08)',
        background: isMe ? '#FFFDF5' : '#fff',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="avatar avatar-lg flex-shrink-0"
          style={{ background: isMe ? '#FFCE00' : '#623CEA', color: isMe ? '#221D23' : '#fff' }}
        >
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-brand-dark text-sm">{name}</span>
            {isMe && <span className="tag tag-yellow text-[10px] py-0">You</span>}
          </div>
          {(role || team) && (
            <div className="text-xs text-text-muted mt-0.5">
              {role}{role && team && ' · '}{team}
            </div>
          )}
          {message && (
            <p className="text-sm text-text-secondary mt-2 leading-relaxed">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
