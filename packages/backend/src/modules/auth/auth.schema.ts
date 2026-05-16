import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const registerSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(['MENTOR', 'COMPANY_REP', 'PARTNER', 'SERVICE_PROVIDER']),
  // Mentor fields
  bio: z.string().optional(),
  expertise: z.array(z.string()).optional(),
  industries: z.array(z.string()).optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  websiteUrl: z.string().url().optional().or(z.literal('')),
  yearsExperience: z.coerce.number().int().min(0).optional(),
  maxMentees: z.coerce.number().int().min(1).optional(),
  availabilityHours: z.coerce.number().int().min(1).optional(),
  // Company fields
  companyName: z.string().optional(),
  registrationNo: z.string().optional(),
  industry: z.string().optional(),
  stage: z.string().optional(),
  description: z.string().optional(),
  problem: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  country: z.string().optional(),
  city: z.string().optional(),
  foundedYear: z.coerce.number().int().optional(),
  teamSize: z.coerce.number().int().optional(),
  needsTags: z.array(z.string()).optional(),
  // Partner fields
  orgName: z.string().optional(),
  orgType: z.string().optional(),
  focusAreas: z.array(z.string()).optional(),
  // Service provider fields
  serviceTypes: z.array(z.string()).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: passwordSchema,
});

export const completeOAuthSchema = z.object({
  tempToken: z.string().min(1),
  role: z.enum(['MENTOR', 'COMPANY_REP', 'PARTNER', 'SERVICE_PROVIDER']),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});
