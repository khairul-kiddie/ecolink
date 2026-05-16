import crypto from 'crypto';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { hashPassword, comparePassword } from '../../utils/password';
import { signAccessToken, signRefreshToken, verifyRefreshToken, verifyAccessToken } from '../../utils/jwt';
import { AppError } from '../../middleware/errorHandler.middleware';
import { emailService } from '../../services/email.service';
import { embeddingQueue } from '../../jobs/queue';
import { UserRole } from '@prisma/client';
import { logger } from '../../utils/logger';

function randomToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'MENTOR' | 'COMPANY_REP' | 'PARTNER' | 'SERVICE_PROVIDER';
  [key: string]: unknown;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Email already registered');
  }

  const passwordHash = await hashPassword(data.password);
  const verificationToken = randomToken();
  const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role as UserRole,
        emailVerificationToken: verificationToken,
        emailVerificationExpiry: verificationExpiry,
      },
    });

    if (data.role === 'MENTOR') {
      await tx.mentorProfile.create({
        data: {
          userId: user.id,
          bio: (data.bio as string) || null,
          expertise: (data.expertise as string[]) || [],
          industries: (data.industries as string[]) || [],
          linkedinUrl: (data.linkedinUrl as string) || null,
          websiteUrl: (data.websiteUrl as string) || null,
          yearsExperience: data.yearsExperience as number | undefined,
          maxMentees: (data.maxMentees as number) || 3,
          availabilityHours: (data.availabilityHours as number) || 4,
        },
      });
    } else if (data.role === 'COMPANY_REP') {
      await tx.companyProfile.create({
        data: {
          userId: user.id,
          companyName: (data.companyName as string) || 'My Company',
          registrationNo: (data.registrationNo as string) || null,
          industry: (data.industry as string) || 'Technology',
          stage: (data.stage as string) || 'pre-seed',
          description: (data.description as string) || null,
          problem: (data.problem as string) || null,
          website: (data.website as string) || null,
          country: (data.country as string) || 'Malaysia',
          city: (data.city as string) || null,
          foundedYear: data.foundedYear as number | undefined,
          teamSize: data.teamSize as number | undefined,
          needsTags: (data.needsTags as string[]) || [],
        },
      });
    } else if (data.role === 'PARTNER') {
      await tx.partnerProfile.create({
        data: {
          userId: user.id,
          orgName: (data.orgName as string) || 'My Organisation',
          orgType: (data.orgType as string) || 'other',
          description: (data.description as string) || null,
          website: (data.website as string) || null,
          country: (data.country as string) || null,
          focusAreas: (data.focusAreas as string[]) || [],
        },
      });
    } else if (data.role === 'SERVICE_PROVIDER') {
      await tx.serviceProviderProfile.create({
        data: {
          userId: user.id,
          orgName: (data.orgName as string) || 'My Organisation',
          serviceTypes: (data.serviceTypes as string[]) || [],
          description: (data.description as string) || null,
          website: (data.website as string) || null,
          country: (data.country as string) || null,
        },
      });
    }

    return user;
  });

  await emailService.sendVerificationEmail(data.email, data.firstName, verificationToken);
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({
    where: { emailVerificationToken: token },
  });

  if (!user) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid verification token');
  if (user.emailVerificationExpiry && user.emailVerificationExpiry < new Date()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Verification token has expired');
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isEmailVerified: true,
      status: 'ACTIVE',
      emailVerificationToken: null,
      emailVerificationExpiry: null,
    },
  });

  // Trigger embedding generation for the new profile
  const profile = await getProfileForUser(user.id, user.role);
  if (profile) {
    await embeddingQueue.add('generate-embedding', {
      entityType: roleToEntityType(user.role),
      entityId: profile.id,
    });
  }
}

async function getProfileForUser(userId: string, role: string) {
  if (role === 'MENTOR') return prisma.mentorProfile.findUnique({ where: { userId } });
  if (role === 'COMPANY_REP') return prisma.companyProfile.findUnique({ where: { userId } });
  if (role === 'PARTNER') return prisma.partnerProfile.findUnique({ where: { userId } });
  if (role === 'SERVICE_PROVIDER') return prisma.serviceProviderProfile.findUnique({ where: { userId } });
  return null;
}

function roleToEntityType(role: string): string {
  const map: Record<string, string> = {
    MENTOR: 'mentor',
    COMPANY_REP: 'company',
    PARTNER: 'partner',
    SERVICE_PROVIDER: 'service_provider',
  };
  return map[role] || 'mentor';
}

export async function loginUser(
  email: string,
  password: string,
  ip?: string,
  userAgent?: string
) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.passwordHash) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }
  if (!user.isEmailVerified) {
    throw new AppError(401, 'UNAUTHORIZED', 'Please verify your email before logging in');
  }
  if (user.status !== 'ACTIVE') {
    throw new AppError(401, 'UNAUTHORIZED', 'Account is not active');
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  const tokenPayload = { sub: user.id, role: user.role, email: user.email };
  const accessToken = signAccessToken(tokenPayload);
  const refreshToken = signRefreshToken(tokenPayload);

  await prisma.$transaction([
    prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: ip,
        userAgent,
      },
    }),
    prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }),
    prisma.auditLog.create({
      data: { userId: user.id, action: 'LOGIN', entityType: 'User', entityId: user.id, ipAddress: ip, userAgent },
    }),
  ]);

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function refreshTokens(token: string) {
  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid refresh token');
  }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token is invalid or expired');
  }

  const newTokenPayload = { sub: payload.sub, role: payload.role, email: payload.email };
  const accessToken = signAccessToken(newTokenPayload);
  const newRefreshToken = signRefreshToken(newTokenPayload);

  await prisma.$transaction([
    prisma.refreshToken.update({ where: { id: stored.id }, data: { isRevoked: true } }),
    prisma.refreshToken.create({
      data: {
        token: newRefreshToken,
        userId: stored.userId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    }),
  ]);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function logoutUser(accessToken: string) {
  let payload;
  try {
    payload = verifyAccessToken(accessToken);
  } catch {
    return; // already invalid
  }

  await prisma.refreshToken.updateMany({
    where: { userId: payload.sub, isRevoked: false },
    data: { isRevoked: true },
  });

  await redis.del(`user:${payload.sub}`);
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // prevent enumeration

  const token = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await emailService.sendPasswordResetEmail(email, user.firstName, token);
}

export async function resetPassword(token: string, newPassword: string) {
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Invalid or expired reset token');
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({ where: { userId: resetToken.userId }, data: { isRevoked: true } }),
  ]);

  await redis.del(`user:${resetToken.userId}`);
}

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      mentorProfile: true,
      companyProfile: true,
      partnerProfile: true,
      serviceProviderProfile: true,
    },
  });

  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');
  return user;
}
