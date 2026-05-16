'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { formatScore } from '@/lib/utils';
import { toast } from 'sonner';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from 'recharts';
import { Bot, CheckCircle, XCircle } from 'lucide-react';

interface MatchProposal {
  id: string;
  score: number;
  rationale: string;
  status: string;
  scoreBreakdown: {
    expertiseMatch: number;
    industryAlignment: number;
    availabilityScore: number;
    semanticSimilarity: number;
    pastEngagementBonus: number;
  };
  mentor?: { id: string; expertise: string[]; industries: string[]; user: { firstName: string; lastName: string; avatarUrl?: string } };
  company?: { id: string; companyName: string; industry: string; user: { firstName: string; lastName: string } };
}

export default function MatchingPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['proposals'],
    queryFn: () => api.get('/matching/proposals').then(r => r.data),
  });

  const acceptMutation = useMutation({
    mutationFn: (id: string) => api.post(`/matching/proposals/${id}/accept`),
    onSuccess: () => {
      toast.success('Match accepted! Relationship created.');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
    onError: () => toast.error('Failed to accept match'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/matching/proposals/${id}/reject`, { reason: 'Not a good fit' }),
    onSuccess: () => {
      toast.success('Match declined');
      queryClient.invalidateQueries({ queryKey: ['proposals'] });
    },
  });

  const proposals: MatchProposal[] = data?.data || [];

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-600" />
            AI Matching Centre
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gemini 1.5 Pro powered mentor-company matching</p>
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />)}
        </div>
      )}

      {!isLoading && proposals.length === 0 && (
        <div className="text-center py-20">
          <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">No match proposals yet</h3>
          <p className="text-gray-400 mt-2">AI matching will generate proposals when programmes are active.</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {proposals.map((proposal) => {
          const radarData = [
            { subject: 'Expertise', value: Math.round((proposal.scoreBreakdown?.expertiseMatch || 0) * 100) },
            { subject: 'Industry', value: Math.round((proposal.scoreBreakdown?.industryAlignment || 0) * 100) },
            { subject: 'Availability', value: Math.round((proposal.scoreBreakdown?.availabilityScore || 0) * 100) },
            { subject: 'Semantic', value: Math.round((proposal.scoreBreakdown?.semanticSimilarity || 0) * 100) },
          ];

          return (
            <div key={proposal.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        proposal.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                        proposal.status === 'ACCEPTED' ? 'bg-green-100 text-green-700' :
                        'bg-red-100 text-red-700'
                      }`}>{proposal.status}</span>
                      <span className="text-xs text-gray-400 flex items-center gap-1"><Bot className="w-3 h-3" /> AI Generated</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {proposal.mentor?.user.firstName} {proposal.mentor?.user.lastName}
                      {proposal.company && <span className="text-gray-400"> → {proposal.company.companyName}</span>}
                    </h3>
                    {proposal.mentor?.expertise && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {proposal.mentor.expertise.slice(0, 3).map(e => (
                          <span key={e} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{formatScore(proposal.score)}</div>
                    <div className="text-xs text-gray-400">match score</div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">AI Rationale</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{proposal.rationale}</p>
                </div>

                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData}>
                      <PolarGrid strokeDasharray="3 3" />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                      <Tooltip formatter={(v) => [`${v}%`]} />
                      <Radar name="Score" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {proposal.status === 'PENDING' && (
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                  <button
                    onClick={() => acceptMutation.mutate(proposal.id)}
                    disabled={acceptMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50">
                    <CheckCircle className="w-4 h-4" />
                    Accept Match
                  </button>
                  <button
                    onClick={() => rejectMutation.mutate(proposal.id)}
                    disabled={rejectMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50">
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
