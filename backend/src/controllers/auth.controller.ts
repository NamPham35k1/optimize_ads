import { Request, Response, NextFunction } from 'express';
import prisma from '../db.js';
import { AuthService } from '../services/auth/auth.service.js';
import { PasswordUtil } from '../utils/password.js';

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
  };
}

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      if (!email) {
        res.status(400).json({ success: false, error: 'Email là bắt buộc' });
        return;
      }

      const result = await AuthService.login(email.trim().toLowerCase(), password);
      res.json({ success: true, data: result });
    } catch (err: any) {
      res.status(401).json({ success: false, error: err.message });
    }
  }

  public static async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      let userId = req.user?.userId;

      if (!userId && token) {
        const payload = AuthService.verifyToken(token);
        if (payload) userId = payload.userId;
      }

      // Default to first user (Admin) if no token provided in local dev
      let user = null;
      if (userId) {
        user = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            accountAssignments: {
              include: {
                adAccount: {
                  select: { id: true, name: true, facebookAdAccountId: true },
                },
              },
            },
          },
        });
      } else {
        user = await prisma.user.findFirst({
          include: {
            accountAssignments: {
              include: {
                adAccount: {
                  select: { id: true, name: true, facebookAdAccountId: true },
                },
              },
            },
          },
        });
      }

      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
        return;
      }

      res.json({
        success: true,
        data: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          assignedAdAccountIds: user.accountAssignments.map((a) => a.adAccountId),
          assignedAdAccounts: user.accountAssignments.map((a) => a.adAccount),
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async listUsers(req: Request, res: Response): Promise<void> {
    try {
      const users = await prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          accountAssignments: {
            include: {
              adAccount: {
                select: { id: true, name: true, facebookAdAccountId: true, currency: true },
              },
            },
          },
        },
      });

      const sanitized = users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
        assignedAdAccounts: u.accountAssignments.map((a) => a.adAccount),
        assignedAdAccountIds: u.accountAssignments.map((a) => a.adAccountId),
      }));

      res.json({ success: true, data: sanitized });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async createUser(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password, role = 'SUB_ACCOUNT', assignedAdAccountIds = [] } = req.body;

      if (!name || !email) {
        res.status(400).json({ success: false, error: 'Họ tên và email là bắt buộc' });
        return;
      }

      const existing = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
      });

      if (existing) {
        res.status(400).json({ success: false, error: 'Email này đã tồn tại trong hệ thống' });
        return;
      }

      const passwordHash = password ? PasswordUtil.hashPassword(password) : '';

      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          passwordHash,
          role,
          isActive: true,
        },
      });

      // Assign Ad Accounts
      if (Array.isArray(assignedAdAccountIds) && assignedAdAccountIds.length > 0) {
        await prisma.userAccountAssignment.createMany({
          data: assignedAdAccountIds.map((accId: string) => ({
            userId: newUser.id,
            adAccountId: accId,
          })),
        });
      }

      const created = await prisma.user.findUnique({
        where: { id: newUser.id },
        include: {
          accountAssignments: {
            include: { adAccount: true },
          },
        },
      });

      res.status(201).json({ success: true, data: created });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateUser(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const { name, email, password, role, isActive, assignedAdAccountIds } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name.trim();
      if (email) updateData.email = email.trim().toLowerCase();
      if (role) updateData.role = role;
      if (isActive !== undefined) updateData.isActive = Boolean(isActive);
      if (password) updateData.passwordHash = PasswordUtil.hashPassword(password);

      await prisma.user.update({
        where: { id },
        data: updateData,
      });

      // Update AdAccount assignments if provided
      if (Array.isArray(assignedAdAccountIds)) {
        await prisma.userAccountAssignment.deleteMany({
          where: { userId: id },
        });

        if (assignedAdAccountIds.length > 0) {
          await prisma.userAccountAssignment.createMany({
            data: assignedAdAccountIds.map((accId: string) => ({
              userId: id,
              adAccountId: accId,
            })),
          });
        }
      }

      const updated = await prisma.user.findUnique({
        where: { id },
        include: {
          accountAssignments: {
            include: { adAccount: true },
          },
        },
      });

      res.json({ success: true, data: updated });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteUser(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const user = await prisma.user.findUnique({ where: { id } });

      if (!user) {
        res.status(404).json({ success: false, error: 'Không tìm thấy người dùng' });
        return;
      }

      if (user.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount <= 1) {
          res.status(400).json({ success: false, error: 'Không thể xóa tài khoản Admin duy nhất' });
          return;
        }
      }

      await prisma.user.delete({ where: { id } });
      res.json({ success: true, message: 'Đã xóa người dùng thành công' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
