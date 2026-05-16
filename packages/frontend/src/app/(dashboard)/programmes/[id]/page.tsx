'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { BookOpen, Calendar, Users, Zap } from 'lucide-react';

interface Programme {
  id: string;
  name: string;
  description?: string;
  status: string;
  country: string;
  city?: string;
  startDate?: string;
  endDate?: string;
  targetIndustries: string[];
  targetStages: string[];
  benefits: string[];
  requirements: string[];
  maxCompanies?: number;
  owner: { firstName: string; lastName: string; email: string };
  _count: { applications: number; relationships: number };
}

export default function ProgrammeDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['programme', params.id],
    queryFn: () => api.get(`/programmes/${params.id}`).then(r => r.data.data) as Promise<Programme>,
  });

  const applyMutation = useMutation({
    mutationFn: () => api.post(`/programmes/${params.id}/applications`, {}),
    onSuccess: () => {
      toast.success('Application submitted!');
      queryClient.invalidateQueries({ queryKey: ['programme', params.id] });
    },
    onError: (err: unknown) => {
      toast.error((err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || 'Application failed');
    },
  });

  const triggerMatchingMutation = useMutation({
    mutationFn: () => api.post(`/programmes/${params.id}/trigger-matching`, {}),
    onSuccess: () => toast.success('Batch matching job queued!'),
    onError: () => toast.error('Failed to trigger matching'),
  });

  if (isLoading) {
    return <div className="p-8 animate-pulse"><div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-64 mb-4" /></div>;
  }

  if (!data) return <div className="p-8 text-gray-500">Programme not found</div>;

  const canApply = user?.role === 'COMPANY_REP';
  const canManage = ['SUPER_ADMIN', 'PROGRAMME_OWNER', 'ECOSYSTEM_ADMIN'].includes(user?.role || '');

  return (
    <div className="p-8">
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{data.name}</h1>
              <span className={`text-sm px-3 py-1 rounded-full font-medium ${
                data.status === 'OPEN' ? 'bg-green-100 text-green-700' :
                data.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>{data.status.replace('_', ' ')}</span>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              By {data.owner.firstName} {data.owner.lastName} · {data.city ? `${data.city}, ` : ''}{data.country}
            </p>
          </div>
          <div className="flex gap-3">
            {canApply && data.status === 'OPEN' && (
              <button onClick={() => applyMutation.mutate()} disabled={applyMutation.isPending}
                className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">
                {applyMutation.isPending ? 'Applying...' : 'Apply Now'}
              </button>
            )}
            {canManage && (
              <button onClick={() => triggerMatchingMutation.mutate()} disabled={triggerMatchingMutation.isPending}
                className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm">
                <Zap className="w-4 h-4" />
                {triggerMatchingMutation.isPending ? 'Queuing...' : 'Run AI Matching'}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {data.description && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">About</h2>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{data.description}</p>
            </div>
          )}

          {data.benefits.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Benefits</h2>
              <ul className="space-y-2">
                {data.benefits.map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                    {b}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.requirements.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Requirements</h2>
              <ul className="space-y-2">
                {data.requirements.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Programme Details</h3>
            <div className="space-y-3 text-sm">
              {(data.startDate || data.endDate) && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>{data.startDate && formatDate(data.startDate)}{data.endDate && ` – ${formatDate(data.endDate)}`}</span>
                </div>
              )}
              {data.maxCompanies && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Users className="w-4 h-4 flex-shrink-0" />
                  <span>Up to {data.maxCompanies} companies</span>
                </div>
              )}
              <div className="pt-2 border-t border-gray-100 dark:border-gray-700 grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{data._count.applications}</p>
                  <p className="text-xs text-gray-400">Applications</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{data._count.relationships}</p>
                  <p className="text-xs text-gray-400">Relationships</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Target Industries</h3>
            <div className="flex flex-wrap gap-2">
              {data.targetIndustries.map(i => (
                <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2.5 py-1 rounded-full">{i}</span>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 text-sm">Target Stages</h3>
            <div className="flex flex-wrap gap-2">
              {data.targetStages.map(s => (
                <span key={s} className="text-xs bg-purple-50 dark:bg-purple-900/20 text-purple-600 px-2.5 py-1 rounded-full">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
