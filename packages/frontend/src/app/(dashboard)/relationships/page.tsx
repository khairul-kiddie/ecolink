'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatDate, formatScore } from '@/lib/utils';
import { Link2, Bot } from 'lucide-react';

interface Relationship {
  id: string;
  type: string;
  status: string;
  aiMatchScore?: number;
  isAiGenerated: boolean;
  createdAt: string;
  mentor?: { user: { firstName: string; lastName: string; avatarUrl?: string } };
  company?: { companyName: string; user: { firstName: string; lastName: string } };
  programme?: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PROPOSED: 'bg-yellow-100 text-yellow-700',
  PENDING_APPROVAL: 'bg-orange-100 text-orange-700',
  PAUSED: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-purple-100 text-purple-700',
  TERMINATED: 'bg-red-100 text-red-600',
};

export default function RelationshipsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['relationships'],
    queryFn: () => api.get('/relationships').then(r => r.data),
  });

  const relationships: Relationship[] = data?.data || [];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Link2 className="w-6 h-6 text-blue-600" />
          Relationships
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">First-class relationship entities with lifecycle management</p>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && relationships.length === 0 && (
        <div className="text-center py-20">
          <Link2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No relationships yet</h3>
          <p className="text-gray-400 mt-2">Relationships are created when match proposals are accepted.</p>
        </div>
      )}

      <div className="space-y-3">
        {relationships.map((rel) => (
          <div key={rel.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between hover:shadow-sm transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 text-sm font-semibold">
                {rel.type === 'MENTOR_COMPANY' ? '🎓' : rel.type === 'COMPANY_PROGRAMME' ? '🚀' : '🤝'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {rel.mentor ? `${rel.mentor.user.firstName} ${rel.mentor.user.lastName}` : '—'}
                    {rel.company && <span className="text-gray-400"> → {rel.company.companyName}</span>}
                  </p>
                  {rel.isAiGenerated && (
                    <span className="flex items-center gap-0.5 text-xs text-blue-500"><Bot className="w-3 h-3" />AI</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-gray-400">{rel.type.replace(/_/g, ' ')}</span>
                  {rel.programme && <span className="text-xs text-gray-400">· {rel.programme.name}</span>}
                  <span className="text-xs text-gray-400">· {formatDate(rel.createdAt)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {rel.aiMatchScore && (
                <span className="text-xs text-blue-600 font-medium">{formatScore(rel.aiMatchScore)}</span>
              )}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLORS[rel.status] || 'bg-gray-100 text-gray-600'}`}>
                {rel.status.replace('_', ' ')}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
