import crypto from 'crypto';
import prisma from '../../db.js';
import { config } from '../../config/index.js';
import { PasswordUtil } from '../../utils/password.js';

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
  exp: number;
}

export class AuthService {
  private static secret = config.encryptionKey || 'auto-ads-care-secret-key-32chr!';

  public static generateToken(payload: Omit<AuthTokenPayload, 'exp'>, expiresInHours = 72): string {
    const fullPayload: AuthTokenPayload = {
      ...payload,
      exp: Date.now() + expiresInHours * 60 * 60 * 1000,
    };
    const body = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('base64url');
    return `${body}.${signature}`;
  }

  public static verifyToken(token: string): AuthTokenPayload | null {
    try {
      if (!token || !token.includes('.')) return null;
      const [body, signature] = token.split('.');
      const expectedSig = crypto
        .createHmac('sha256', this.secret)
        .update(body)
        .digest('base64url');

      if (signature !== expectedSig) return null;

      const payload: AuthTokenPayload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8')
      );

      if (Date.now() > payload.exp) return null;

      return payload;
    } catch {
      return null;
    }
  }

  public static async login(email: string, password?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        accountAssignments: {
          include: { adAccount: true },
        },
      },
    });

    if (!user) {
      throw new Error('Tài khoản hoặc mật khẩu không chính xác');
    }

    if (!user.isActive) {
      throw new Error('Tài khoản của bạn đã bị vô hiệu hóa. Vui lòng liên hệ Admin.');
    }

    // If user has a password set, verify it
    if (user.passwordHash) {
      if (!password || !PasswordUtil.verifyPassword(password, user.passwordHash)) {
        throw new Error('Tài khoản hoặc mật khẩu không chính xác');
      }
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        assignedAdAccountIds: user.accountAssignments.map((a: any) => a.adAccountId),
      },
    };
  }
}
