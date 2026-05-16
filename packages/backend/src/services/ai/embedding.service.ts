import { embeddingModel } from '../../config/gemini';
import { MentorProfile, CompanyProfile, User } from '@prisma/client';

export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await embeddingModel.embedContent(text);
  return result.embedding.values;
}

export function buildMentorEmbeddingText(mentor: MentorProfile & { user: User }): string {
  const parts = [
    `Name: ${mentor.user.firstName} ${mentor.user.lastName}`,
    mentor.bio ? `Bio: ${mentor.bio}` : '',
    mentor.expertise.length ? `Expertise: ${mentor.expertise.join(', ')}` : '',
    mentor.industries.length ? `Industries: ${mentor.industries.join(', ')}` : '',
    `Experience: ${mentor.yearsExperience || 0} years`,
    `Availability: ${mentor.availabilityHours} hours per month`,
  ];
  return parts.filter(Boolean).join('\n');
}

export function buildCompanyEmbeddingText(company: CompanyProfile & { user: User }): string {
  const parts = [
    `Company: ${company.companyName}`,
    `Industry: ${company.industry}`,
    `Stage: ${company.stage}`,
    company.description ? `Description: ${company.description}` : '',
    company.problem ? `Problem: ${company.problem}` : '',
    company.needsTags.length ? `Needs: ${company.needsTags.join(', ')}` : '',
    company.country ? `Location: ${company.city ? company.city + ', ' : ''}${company.country}` : '',
  ];
  return parts.filter(Boolean).join('\n');
}

export function buildPartnerEmbeddingText(partner: { orgName: string; orgType: string; description?: string | null; focusAreas: string[]; user: User }): string {
  const parts = [
    `Organisation: ${partner.orgName}`,
    `Type: ${partner.orgType}`,
    partner.description ? `Description: ${partner.description}` : '',
    partner.focusAreas.length ? `Focus Areas: ${partner.focusAreas.join(', ')}` : '',
  ];
  return parts.filter(Boolean).join('\n');
}

export function buildServiceProviderEmbeddingText(sp: { orgName: string; serviceTypes: string[]; description?: string | null; user: User }): string {
  const parts = [
    `Organisation: ${sp.orgName}`,
    sp.serviceTypes.length ? `Services: ${sp.serviceTypes.join(', ')}` : '',
    sp.description ? `Description: ${sp.description}` : '',
  ];
  return parts.filter(Boolean).join('\n');
}
