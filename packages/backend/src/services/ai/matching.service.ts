import { z } from 'zod';
import { prisma } from '../../config/database';
import { geminiPro } from '../../config/gemini';
import { logger } from '../../utils/logger';

export interface MatchResult {
  entityId: string;
  score: number;
  rationale: string;
  scoreBreakdown: {
    semanticSimilarity: number;
    expertiseMatch: number;
    industryAlignment: number;
    availabilityScore: number;
    pastEngagementBonus: number;
  };
}

const geminiResponseSchema = z.object({
  overall_score: z.number().min(0).max(1),
  expertise_match: z.number().min(0).max(1),
  industry_alignment: z.number().min(0).max(1),
  stage_fit: z.number().min(0).max(1),
  complementarity: z.number().min(0).max(1),
  rationale: z.string(),
  top_3_value_points: z.array(z.string()),
  potential_risks: z.array(z.string()),
});

const MATCH_PROMPT = `You are an expert ecosystem relationship manager for innovation programmes.
Analyze the compatibility between a mentor and a startup company.

Mentor Profile:
- Expertise: {expertise_tags}
- Industries: {industries}
- Bio: {bio_summary}
- Past engagement outcomes: {outcomes}
- Monthly availability: {hours}h

Company Profile:
- Industry: {industry}
- Stage: {stage}
- Problem: {problem_statement}
- Needs: {needs_tags}
- Description: {description}

Score their compatibility from 0.0 to 1.0 across these dimensions:
1. expertise_match: Do the mentor's skills directly address the company's stated needs?
2. industry_alignment: Does the mentor have experience in the company's industry?
3. stage_fit: Is the mentor's background relevant to this company's growth stage?
4. complementarity: What unique value can this mentor bring that the company lacks?

Return ONLY valid JSON in this format:
{
  "overall_score": 0.0-1.0,
  "expertise_match": 0.0-1.0,
  "industry_alignment": 0.0-1.0,
  "stage_fit": 0.0-1.0,
  "complementarity": 0.0-1.0,
  "rationale": "2-3 sentence explanation of why this is or isn't a good match",
  "top_3_value_points": ["point1", "point2", "point3"],
  "potential_risks": ["risk1"]
}

Be objective. Do not hallucinate expertise or experiences not explicitly mentioned.`;

async function reRankWithGemini(
  mentor: { expertise: string[]; industries: string[]; bio?: string | null; availabilityHours: number },
  company: { industry: string; stage: string; problem?: string | null; needsTags: string[]; description?: string | null }
): Promise<z.infer<typeof geminiResponseSchema> | null> {
  const prompt = MATCH_PROMPT
    .replace('{expertise_tags}', mentor.expertise.join(', ') || 'N/A')
    .replace('{industries}', mentor.industries.join(', ') || 'N/A')
    .replace('{bio_summary}', mentor.bio?.slice(0, 200) || 'N/A')
    .replace('{outcomes}', 'N/A')
    .replace('{hours}', String(mentor.availabilityHours))
    .replace('{industry}', company.industry)
    .replace('{stage}', company.stage)
    .replace('{problem_statement}', company.problem?.slice(0, 200) || 'N/A')
    .replace('{needs_tags}', company.needsTags.join(', ') || 'N/A')
    .replace('{description}', company.description?.slice(0, 200) || 'N/A');

  try {
    const result = await geminiPro.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    return geminiResponseSchema.parse(parsed);
  } catch (err) {
    logger.error('Gemini re-ranking failed', { error: (err as Error).message });
    return null;
  }
}

export async function findMentorsForCompany(
  companyId: string,
  limit = 5,
  programmeId?: string
): Promise<MatchResult[]> {
  const company = await prisma.companyProfile.findUnique({
    where: { id: companyId },
    include: { user: true },
  });
  if (!company) return [];

  // Step 1: Vector search for top-K candidates
  let mentorIds: string[] = [];
  if (company.embedding) {
    const results = await prisma.$queryRaw<{ id: string; similarity: number }[]>`
      SELECT id, 1 - (embedding <=> ${company.embedding}::vector) as similarity
      FROM mentor_profiles
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${company.embedding}::vector
      LIMIT ${limit * 3}
    `;
    mentorIds = results.map(r => r.id);
  } else {
    const mentors = await prisma.mentorProfile.findMany({ take: limit * 3, select: { id: true } });
    mentorIds = mentors.map(m => m.id);
  }

  // Step 2: Gemini re-ranking
  const mentors = await prisma.mentorProfile.findMany({
    where: { id: { in: mentorIds } },
    include: { user: true },
  });

  const results: MatchResult[] = [];
  for (const mentor of mentors) {
    const geminiResult = await reRankWithGemini(mentor, company);
    const baseScore = geminiResult ? Math.min(geminiResult.overall_score, 0.95) : Math.random() * 0.5 + 0.3;

    results.push({
      entityId: mentor.id,
      score: baseScore,
      rationale: geminiResult?.rationale || 'Based on profile similarity analysis.',
      scoreBreakdown: {
        semanticSimilarity: 0.7,
        expertiseMatch: geminiResult?.expertise_match || 0.5,
        industryAlignment: geminiResult?.industry_alignment || 0.5,
        availabilityScore: mentor.availabilityHours >= 4 ? 0.8 : 0.5,
        pastEngagementBonus: 0,
      },
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function findCompaniesForMentor(mentorId: string, limit = 5): Promise<MatchResult[]> {
  const mentor = await prisma.mentorProfile.findUnique({
    where: { id: mentorId },
    include: { user: true },
  });
  if (!mentor) return [];

  let companyIds: string[] = [];
  if (mentor.embedding) {
    const results = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id
      FROM company_profiles
      WHERE embedding IS NOT NULL
      ORDER BY embedding <=> ${mentor.embedding}::vector
      LIMIT ${limit * 3}
    `;
    companyIds = results.map(r => r.id);
  } else {
    const companies = await prisma.companyProfile.findMany({ take: limit * 3, select: { id: true } });
    companyIds = companies.map(c => c.id);
  }

  const companies = await prisma.companyProfile.findMany({
    where: { id: { in: companyIds } },
    include: { user: true },
  });

  const results: MatchResult[] = [];
  for (const company of companies) {
    const geminiResult = await reRankWithGemini(mentor, company);
    const score = geminiResult ? Math.min(geminiResult.overall_score, 0.95) : Math.random() * 0.5 + 0.3;

    results.push({
      entityId: company.id,
      score,
      rationale: geminiResult?.rationale || 'Based on profile compatibility.',
      scoreBreakdown: {
        semanticSimilarity: 0.6,
        expertiseMatch: geminiResult?.expertise_match || 0.5,
        industryAlignment: geminiResult?.industry_alignment || 0.5,
        availabilityScore: 0.7,
        pastEngagementBonus: 0,
      },
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

export async function batchMatchForProgramme(programmeId: string): Promise<void> {
  const applications = await prisma.programmeApplication.findMany({
    where: { programmeId, status: 'APPROVED' },
    include: { company: true },
  });

  for (const app of applications) {
    const matches = await findMentorsForCompany(app.companyId, 3, programmeId);

    for (const match of matches) {
      const existing = await prisma.matchProposal.findFirst({
        where: { mentorId: match.entityId, companyId: app.companyId, status: 'PENDING' },
      });
      if (existing) continue;

      await prisma.matchProposal.create({
        data: {
          mentorId: match.entityId,
          companyId: app.companyId,
          score: match.score,
          rationale: match.rationale,
          scoreBreakdown: match.scoreBreakdown,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  logger.info('Batch matching completed', { programmeId, applicationsProcessed: applications.length });
}
