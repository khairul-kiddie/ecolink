import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { env } from '../../config/env';
import { AppError } from '../../middleware/errorHandler.middleware';

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.registerUser(req.body);
    res.status(201).json({ success: true, message: 'Verification email sent. Please check your inbox.' });
  } catch (err) {
    next(err);
  }
}

export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.verifyEmail(req.body.token);
    res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    next(err);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await authService.loginUser(req.body.email, req.body.password, ip, userAgent);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.headers.authorization?.split(' ')[1] || '';
    await authService.logoutUser(token);
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.forgotPassword(req.body.email);
    res.json({ success: true, message: 'If that email exists, you will receive a reset link' });
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await authService.resetPassword(req.body.token, req.body.newPassword);
    res.json({ success: true, message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

export function googleOAuth(req: Request, res: Response): void {
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code } = req.query as { code: string };
    if (!code) throw new AppError(400, 'VALIDATION_ERROR', 'Missing authorization code');

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${req.protocol}://${req.get('host')}/api/v1/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = (await tokenRes.json()) as { access_token: string; id_token: string };
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const googleUser = (await userInfoRes.json()) as { id: string; email: string; given_name: string; family_name: string; picture: string };

    const existingOAuth = await import('../../config/database').then(m =>
      m.prisma.oAuthAccount.findUnique({ where: { provider_providerUserId: { provider: 'google', providerUserId: googleUser.id } } })
    );

    if (existingOAuth) {
      const user = await import('../../config/database').then(m => m.prisma.user.findUnique({ where: { id: existingOAuth.userId } }));
      if (user) {
        const { signAccessToken, signRefreshToken } = await import('../../utils/jwt');
        const payload = { sub: user.id, role: user.role, email: user.email };
        const accessToken = signAccessToken(payload);
        return res.redirect(`${env.FRONTEND_URL}/auth/callback?token=${accessToken}`);
      }
    }

    // New OAuth user — issue temp token with Google data
    const { signAccessToken } = await import('../../utils/jwt');
    const tempToken = signAccessToken({ sub: `google:${googleUser.id}`, role: 'MENTOR', email: googleUser.email });
    const db = await import('../../config/database');
    // Store temp Google data in Redis
    await import('../../config/redis').then(r => r.redis.setex(
      `oauth:temp:${googleUser.id}`,
      600,
      JSON.stringify({ googleId: googleUser.id, email: googleUser.email, firstName: googleUser.given_name, lastName: googleUser.family_name, picture: googleUser.picture })
    ));

    res.redirect(`${env.FRONTEND_URL}/auth/callback?temp_token=${tempToken}&is_new=true`);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}
