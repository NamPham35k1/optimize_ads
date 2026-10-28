import { Request, Response } from 'express';
import { TelegramService } from '../services/telegram/telegram.service.js';

export class TelegramController {
  public static async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const cfg = await TelegramService.getConfig();
      // Mask token for privacy
      const maskedToken = cfg.botToken
        ? `${cfg.botToken.substring(0, 6)}...${cfg.botToken.substring(cfg.botToken.length - 4)}`
        : '';

      res.json({
        success: true,
        data: {
          ...cfg,
          maskedToken,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const { botToken, chatId, isEnabled, periodicEnabled, periodicIntervalMinutes } = req.body;
      const updated = await TelegramService.updateConfig({
        botToken,
        chatId,
        isEnabled,
        periodicEnabled,
        periodicIntervalMinutes,
      });

      res.json({
        success: true,
        data: updated,
        message: 'Cập nhật cấu hình Telegram thành công!',
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async testConnection(req: Request, res: Response): Promise<void> {
    try {
      const { botToken, chatId } = req.body;
      const result = await TelegramService.testConnection(botToken, chatId);
      if (result.success) {
        res.json({ success: true, message: result.message });
      } else {
        res.status(400).json({ success: false, error: result.message });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async sendReportNow(req: Request, res: Response): Promise<void> {
    try {
      const ok = await TelegramService.sendPeriodicReport();
      if (ok) {
        res.json({ success: true, message: 'Đã gửi báo cáo tức thì về Telegram thành công!' });
      } else {
        res.status(400).json({ success: false, error: 'Không thể gửi báo cáo. Vui lòng kiểm tra lại cấu hình bot Telegram.' });
      }
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
