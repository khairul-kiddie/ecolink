import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

async function sendMail(to: string, subject: string, html: string): Promise<void> {
  try {
    await transporter.sendMail({ from: env.SMTP_FROM, to, subject, html });
  } catch (err) {
    logger.error('Failed to send email', { to, subject, error: (err as Error).message });
  }
}

export const emailService = {
  async sendVerificationEmail(to: string, firstName: string, token: string): Promise<void> {
    const url = `${env.FRONTEND_URL}/auth/verify-email?token=${token}`;
    await sendMail(to, 'Verify your EcoLink account', `
      <h2>Welcome to EcoLink, ${firstName}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${url}" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `);
  },

  async sendPasswordResetEmail(to: string, firstName: string, token: string): Promise<void> {
    const url = `${env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    await sendMail(to, 'Reset your EcoLink password', `
      <h2>Password Reset Request</h2>
      <p>Hi ${firstName}, click below to reset your password:</p>
      <a href="${url}" style="background:#ef4444;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, please ignore this email.</p>
    `);
  },

  async sendMatchNotification(to: string, firstName: string, matchData: { mentorName: string; score: number; rationale: string }): Promise<void> {
    await sendMail(to, 'New mentor match proposal on EcoLink', `
      <h2>New Match Proposal, ${firstName}!</h2>
      <p>We found a great mentor for your company:</p>
      <h3>${matchData.mentorName}</h3>
      <p><strong>Match Score:</strong> ${Math.round(matchData.score * 100)}%</p>
      <p><strong>Why this match:</strong> ${matchData.rationale}</p>
      <a href="${env.FRONTEND_URL}/matching" style="background:#3b82f6;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">View Match</a>
    `);
  },
};
