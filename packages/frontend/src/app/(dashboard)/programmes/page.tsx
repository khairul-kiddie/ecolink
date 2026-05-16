'use client';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { BookOpen, Calendar, Users } from 'lucide-react';

interface Programme {
  id: string;
  name: string;
  status: string;
  country: string;
  startDate?: string;
  endDate?: string;
  targetIndustries: string[];
  targetStages: string[];
  owner: { firstName: string; lastName: string };
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-green-100 text-green-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  DRAFT: 'bg-gray-100 text-gray-600',
  COMPLETED: 'bg-purple-100 text-purple-700',
  ARCHIVED: 'bg-red-100 text-red-600',
};

export default function ProgrammesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => api.get('/programmes').then(r => r.data),
  });

  const programmes: Programme[] = data?.data || [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-600" />
            Programmes
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Innovation programmes and accelerators</p>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-48 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && programmes.length === 0 && (
        <div className="text-center py-20">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No programmes yet</h3>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {programmes.map((p) => (
          <div key={p.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow p-6">
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">{p.name}</h3>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ml-2 flex-shrink-0 ${STATUS_COLORS[p.status] || 'bg-gray-100 text-gray-600'}`}>
                {p.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-xs text-gray-500 mb-3">By {p.owner.firstName} {p.owner.lastName} · {p.country}</p>

            <div className="flex flex-wrap gap-1 mb-3">
              {p.targetIndustries.slice(0, 3).map(i => (
                <span key={i} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 px-2 py-0.5 rounded-full">{i}</span>
              ))}
            </div>

            {(p.startDate || p.endDate) && (
              <div className="flex items-center gap-1 text-xs text-gray-400 mb-4">
                <Calendar className="w-3 h-3" />
                {p.startDate && formatDate(p.startDate)}
                {p.startDate && p.endDate && ' – '}
                {p.endDate && formatDate(p.endDate)}
              </div>
            )}

            <Link href={`/programmes/${p.id}`}
              className="w-full block text-center bg-blue-600 text-white text-sm rounded-lg py-2 hover:bg-blue-700 transition-colors">
              View Details
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
