import { Request, Response } from 'express';
import { PancakeService } from '../services/pancake/pancake.service.js';

export class PancakeController {
  public static async listShops(req: Request, res: Response): Promise<void> {
    try {
      const adAccountId = req.query.adAccountId as string | undefined;
      const shops = await PancakeService.getShops(adAccountId);
      res.json({ success: true, data: shops });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async connectShop(req: Request, res: Response): Promise<void> {
    try {
      const { name, shopId, apiToken, pageId, adAccountId, targetCostPercent, warningCostPercent, dangerCostPercent } = req.body;

      if (!name || !shopId || !apiToken) {
        res.status(400).json({
          success: false,
          error: 'Tên cửa hàng, Shop ID và API Token là bắt buộc',
        });
        return;
      }

      const shop = await PancakeService.connectShop({
        name: name.trim(),
        shopId: shopId.trim(),
        apiToken: apiToken.trim(),
        pageId: pageId?.trim(),
        adAccountId,
        targetCostPercent: targetCostPercent ? parseFloat(targetCostPercent) : 35.0,
        warningCostPercent: warningCostPercent ? parseFloat(warningCostPercent) : 40.0,
        dangerCostPercent: dangerCostPercent ? parseFloat(dangerCostPercent) : 50.0,
      });

      // Trigger initial sync or seed
      PancakeService.syncOrders(shop.id).catch((e) =>
        console.error('Initial sync error:', e)
      );

      res.status(201).json({
        success: true,
        message: 'Kết nối cửa hàng POS Pancake thành công',
        data: shop,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async syncShop(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      const result = await PancakeService.syncOrders(id);
      res.json({ success: true, data: result, message: `Đã đồng bộ ${result.syncedCount} đơn hàng từ Pancake` });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async deleteShop(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await PancakeService.deleteShop(id);
      res.json({ success: true, message: 'Đã hủy kết nối cửa hàng Pancake' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getFinancialStats(req: Request, res: Response): Promise<void> {
    try {
      const adAccountId = req.query.adAccountId as string;
      if (!adAccountId) {
        res.status(400).json({ success: false, error: 'adAccountId là bắt buộc' });
        return;
      }

      const stats = await PancakeService.calculateFinancialStats(adAccountId);
      res.json({ success: true, data: stats });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async seedMockOrders(req: Request, res: Response): Promise<void> {
    try {
      const { adAccountId, shopName = 'Kho Hàng Tổng Pancake' } = req.body;
      if (!adAccountId) {
        res.status(400).json({ success: false, error: 'adAccountId là bắt buộc' });
        return;
      }

      // Ensure a shop exists
      const shop = await PancakeService.connectShop({
        name: shopName,
        shopId: `mock_shop_${Date.now().toString().slice(-4)}`,
        apiToken: 'mock_pancake_token_sample',
        adAccountId,
        targetCostPercent: 35.0,
        warningCostPercent: 40.0,
        dangerCostPercent: 50.0,
      });

      const count = await PancakeService.seedOrdersForShop(shop);
      res.json({
        success: true,
        message: `Đã khởi tạo thành công cửa hàng demo và ${count} đơn hàng Pancake!`,
        data: shop,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
