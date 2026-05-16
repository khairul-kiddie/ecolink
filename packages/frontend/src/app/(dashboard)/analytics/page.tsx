'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatScore } from '@/lib/utils';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function AnalyticsPage() {
  const { data: dashboard } = useQuery({
    queryKey: ['analytics-dashboard'],
    queryFn: () => api.get('/analytics/dashboard').then(r => r.data.data),
  });

  const { data: effectiveness } = useQuery({
    queryKey: ['matching-effectiveness'],
    queryFn: () => api.get('/analytics/matching-effectiveness').then(r => r.data.data),
  });

  const pieData = dashboard?.relationshipCounts?.map((item: { type: string; status: string; _count: number }) => ({
    name: item.type?.replace('_', ' ') || item.status,
    value: item._count,
  })).slice(0, 5) || [];

  const barData = [
    { name: 'Accepted', value: effectiveness?.accepted || 0 },
    { name: 'Rejected', value: effectiveness?.rejected || 0 },
    { name: 'Expired', value: effectiveness?.expired || 0 },
    { name: 'Pending', value: (effectiveness?.total || 0) - (effectiveness?.accepted || 0) - (effectiveness?.rejected || 0) - (effectiveness?.expired || 0) },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Ecosystem performance and AI matching insights</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Proposals', value: effectiveness?.total || 0 },
          { label: 'Acceptance Rate', value: formatScore(effectiveness?.acceptanceRate || 0) },
          { label: 'Avg Match Score', value: formatScore(effectiveness?.avgScore || 0) },
          { label: 'Avg Days to Accept', value: `${(effectiveness?.avgDaysToAccept || 0).toFixed(1)}d` },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Match Proposal Outcomes</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Relationship Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_: unknown, index: number) => <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No relationship data yet</div>
          )}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 lg:col-span-2">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-2">AI Matching Performance Summary</h2>
          <p className="text-sm text-gray-500 mb-4">Google Gemini 1.5 Pro + text-embedding-004 powered semantic matching</p>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">{formatScore(effectiveness?.acceptanceRate || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">AI Match Acceptance Rate</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-3xl font-bold text-green-600">{formatScore(effectiveness?.avgScore || 0)}</p>
              <p className="text-sm text-gray-500 mt-1">Average Compatibility Score</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-3xl font-bold text-purple-600">{effectiveness?.total || 0}</p>
              <p className="text-sm text-gray-500 mt-1">Total AI Proposals Generated</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
