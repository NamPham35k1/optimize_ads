import { Request, Response } from 'express';
import prisma from '../db.js';

export class NotificationController {
  public static async getNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { limit = 50 } = req.query;

      const notifications = await prisma.notification.findMany({
        orderBy: { createdAt: 'desc' },
        take: parseInt(String(limit), 10),
      });

      const unreadCount = await prisma.notification.count({
        where: { isRead: false },
      });

      res.json({ success: true, data: notifications, unreadCount });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async markRead(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      if (id === 'all') {
        await prisma.notification.updateMany({
          where: { isRead: false },
          data: { isRead: true },
        });
      } else {
        await prisma.notification.update({
          where: { id },
          data: { isRead: true },
        });
      }

      res.json({ success: true, message: 'Đã cập nhật trạng thái đã đọc' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
