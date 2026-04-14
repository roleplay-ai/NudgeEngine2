interface TopbarProps {
  title: string;
  children?: React.ReactNode;
}

export default function Topbar({ title, children }: TopbarProps) {
  return (
    <header
      className="flex items-center justify-between px-7 flex-shrink-0"
      style={{
        height: '58px',
        background: '#fff',
        borderBottom: '1px solid rgba(34,29,35,0.08)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}
    >
      <h1 className="text-[16px] font-bold text-brand-dark">{title}</h1>
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </header>
  );
}
