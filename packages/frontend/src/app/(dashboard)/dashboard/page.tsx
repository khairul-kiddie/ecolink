'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatScore } from '@/lib/utils';

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${color || 'text-gray-900 dark:text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data.data),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48" />
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-gray-200 dark:bg-gray-700 rounded-xl" />)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.firstName}! 👋
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Here&apos;s your ecosystem overview</p>
      </div>

      {(user?.role === 'SUPER_ADMIN' || user?.role === 'ECOSYSTEM_ADMIN') && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Match Acceptance Rate" value={formatScore(data.matchAcceptanceRate || 0)} color="text-green-600" />
            <StatCard label="Avg Match Score" value={formatScore(data.avgMatchScore || 0)} color="text-blue-600" />
            <StatCard label="New Relationships (30d)" value={data.recentRelationships || 0} />
            <StatCard label="User Roles" value={data.userCounts?.length || 0} sub="distinct roles" />
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">User Distribution</h2>
            <div className="space-y-2">
              {(data.userCounts as Array<{ role: string; _count: number }>)?.map((item) => (
                <div key={item.role} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.role.replace('_', ' ')}</span>
                  <span className="font-semibold text-gray-900 dark:text-white">{item._count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {user?.role === 'PROGRAMME_OWNER' && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.programmes as Array<{ id: string; name: string; status: string; _count: { applications: number; relationships: number } }>)?.map((p) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">{p.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${p.status === 'ACTIVE' || p.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{p.status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-500">Applications</p><p className="text-lg font-bold text-gray-900 dark:text-white">{p._count.applications}</p></div>
                <div><p className="text-xs text-gray-500">Relationships</p><p className="text-lg font-bold text-gray-900 dark:text-white">{p._count.relationships}</p></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {user?.role === 'MENTOR' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Active Relationships" value={data.relationships?.filter((r: { status: string }) => r.status === 'ACTIVE').length || 0} color="text-green-600" />
            <StatCard label="Pending Proposals" value={data.proposals?.length || 0} />
            <StatCard label="Total Companies" value={data.relationships?.length || 0} />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Pending Match Proposals</h2>
            {data.proposals?.length === 0 && <p className="text-gray-400 text-sm">No pending proposals</p>}
            {(data.proposals as Array<{ id: string; score: number; rationale: string }>)?.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{formatScore(p.score)} match score</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{p.rationale}</p>
                </div>
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Pending</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {user?.role === 'COMPANY_REP' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Programme Applications" value={data.applications?.length || 0} />
            <StatCard label="Active Mentors" value={data.mentorRelationships?.filter((r: { status: string }) => r.status === 'ACTIVE').length || 0} color="text-blue-600" />
            <StatCard label="Pending Matches" value={data.pendingProposals?.length || 0} color="text-yellow-600" />
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-white mb-4">AI Match Proposals</h2>
            {data.pendingProposals?.length === 0 && <p className="text-gray-400 text-sm">No pending match proposals. Apply to a programme to get matched!</p>}
            {(data.pendingProposals as Array<{ id: string; score: number; rationale: string; mentor: { user: { firstName: string; lastName: string } } }>)?.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{p.mentor?.user?.firstName} {p.mentor?.user?.lastName}</p>
                  <p className="text-xs text-gray-500">{formatScore(p.score)} compatibility · {p.rationale?.slice(0, 60)}...</p>
                </div>
                <div className="flex gap-2">
                  <button className="text-xs bg-green-600 text-white px-3 py-1 rounded-full hover:bg-green-700">Accept</button>
                  <button className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-3 py-1 rounded-full hover:bg-gray-200">Decline</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
