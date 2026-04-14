import { createClient, getSessionUser } from '@/lib/supabase/server';
import Topbar from '@/components/layout/Topbar';
import StatusBadge from '@/components/ui/StatusBadge';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getProgrammeData(companyId: string) {
  const supabase = await createClient();

  const { data: programmes } = await supabase
    .from('programmes')
    .select(`
      *,
      skills(id),
      cohorts(id, status),
      strategy_pillars(id, name, color)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  const activeProgrammes = (programmes ?? []).filter(p => p.status === 'active');
  const totalCohorts = (programmes ?? []).reduce((sum, p) => sum + (p.cohorts?.length ?? 0), 0);
  const activeCohorts = (programmes ?? []).reduce(
    (sum, p) => sum + (p.cohorts?.filter((c: { status: string }) => c.status !== 'completed')?.length ?? 0), 0
  );

  return {
    programmes: programmes ?? [],
    stats: {
      total: (programmes ?? []).length,
      active: activeProgrammes.length,
      totalCohorts,
      activeCohorts,
    },
  };
}

export default async function ProgrammesPage() {
  const user = await getSessionUser();
  const { programmes, stats } = await getProgrammeData(user!.company_id);

  const statCards = [
    { num: stats.total,         label: 'Total Programmes', color: '#623CEA' },
    { num: stats.activeCohorts, label: 'Active Cohorts',   color: '#F68A29' },
    { num: stats.totalCohorts,  label: 'Total Cohorts',    color: '#3699FC' },
  ];

  return (
    <>
      <Topbar title="Programmes">
        <Link href="/hr/programmes/new" className="btn-primary">+ New Programme</Link>
      </Topbar>

      <main className="flex-1 overflow-y-auto px-7 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3.5 mb-6">
          {statCards.map((s, i) => (
            <div key={i} className="stat-card" style={{ animationDelay: `${i * 60}ms` }}>
              <div className="stat-num" style={{ color: s.color }}>{s.num}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="data-table">
          <div
            className="grid px-5"
            style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', borderBottom: '1px solid rgba(34,29,35,0.08)', background: '#FAFAF7' }}
          >
            {['Name', 'Skills', 'Cohorts', 'Strategy Pillar', 'Status', ''].map(h => (
              <div key={h} className="th">{h}</div>
            ))}
          </div>

          {programmes.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-sm">
              No programmes yet.{' '}
              <Link href="/hr/programmes/new" className="text-brand-purple font-semibold">
                Create your first programme →
              </Link>
            </div>
          ) : (
            programmes.map((prog) => (
              <Link
                key={prog.id}
                href={`/hr/programmes/${prog.id}`}
                className="grid px-5 items-center hover:bg-[#FFFBEE] transition-colors no-underline"
                style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 80px', borderBottom: '0.5px solid rgba(34,29,35,0.06)' }}
              >
                <div className="td">
                  <div className="font-bold text-sm text-brand-dark">{prog.name}</div>
                  {prog.description && (
                    <div className="td-muted line-clamp-1">{prog.description}</div>
                  )}
                </div>
                <div className="td text-text-muted text-xs">{prog.skills?.length ?? 0} skills</div>
                <div className="td text-text-muted text-xs">{prog.cohorts?.length ?? 0} cohorts</div>
                <div className="td">
                  {prog.strategy_pillars ? (
                    <span
                      className="tag"
                      style={{ background: `${prog.strategy_pillars.color}18`, color: prog.strategy_pillars.color }}
                    >
                      {prog.strategy_pillars.name}
                    </span>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
                </div>
                <div className="td">
                  <StatusBadge status={prog.status} />
                </div>
                <div className="td">
                  <span className="text-xs font-bold text-brand-purple">View →</span>
                </div>
              </Link>
            ))
          )}
        </div>
      </main>
    </>
  );
}
