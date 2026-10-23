import { Request, Response } from 'express';
import prisma from '../db.js';
import { MetaService } from '../services/meta-api/meta-service.js';
import { AccountSyncService } from '../services/meta-api/account-sync.service.js';
import { encryptToken, maskToken } from '../utils/encryption.js';

export class AccountController {
  public static async listAccounts(req: Request, res: Response): Promise<void> {
    try {
      const accounts = await prisma.adAccount.findMany({
        include: {
          connectedAccount: {
            select: {
              id: true,
              accountName: true,
              scopes: true,
              isValid: true,
              lastVerifiedAt: true,
              isMock: true,
            },
          },
          _count: {
            select: {
              campaignSnapshots: true,
              careRules: true,
            },
          },
        },
      });

      res.json({ success: true, data: accounts });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async connectLiveAccount(req: Request, res: Response): Promise<void> {
    try {
      const { accessToken, accountName } = req.body;

      if (!accessToken || typeof accessToken !== 'string') {
        res.status(400).json({ success: false, error: 'Access token là bắt buộc' });
        return;
      }

      // Step 1: Validate token with Meta debug_token
      const liveClient = MetaService.getLiveClient();
      const tokenInfo = await liveClient.debugToken(accessToken);

      if (!tokenInfo.isValid) {
        res.status(400).json({
          success: false,
          error: `Token không hợp lệ hoặc đã hết hạn: ${tokenInfo.error || 'Invalid token'}`,
        });
        return;
      }

      // Verify essential permissions: ads_read, ads_management
      const hasAdsRead = tokenInfo.scopes.some((s: string) => s.includes('ads_read'));
      const hasAdsManagement = tokenInfo.scopes.some((s: string) => s.includes('ads_management'));

      if (!hasAdsRead) {
        res.status(400).json({
          success: false,
          error: 'Token thiếu quyền "ads_read". Vui lòng cấp quyền đọc quảng cáo.',
        });
        return;
      }

      // Step 2: Fetch available ad accounts for this token
      const metaAccounts = await liveClient.getAdAccounts(accessToken);
      if (metaAccounts.length === 0) {
        res.status(400).json({
          success: false,
          error: 'Không tìm thấy tài khoản quảng cáo nào mà token này có quyền truy cập.',
        });
        return;
      }

      // Get or create default user
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@autoadscare.io',
            name: 'Auto Ads Admin',
          },
        });
      }

      // Encrypt and store ConnectedAccount
      const encryptedToken = encryptToken(accessToken);
      const connectedAccount = await prisma.connectedAccount.create({
        data: {
          userId: user.id,
          platform: 'META',
          metaUserId: tokenInfo.userId || 'meta_user',
          accountName: accountName || `Meta Account (${maskToken(accessToken)})`,
          accessTokenEncrypted: encryptedToken,
          tokenExpiresAt: tokenInfo.expiresAt,
          scopes: tokenInfo.scopes.join(','),
          isValid: true,
          isMock: false,
        },
      });

      // Create AdAccount records
      const createdAdAccounts = [];
      for (const mAcc of metaAccounts) {
        const adAcc = await prisma.adAccount.upsert({
          where: { facebookAdAccountId: mAcc.id },
          update: {
            name: mAcc.name,
            accountStatus: mAcc.account_status,
            currency: mAcc.currency,
            timezoneName: mAcc.timezone_name,
            connectedAccountId: connectedAccount.id,
            isMock: false,
          },
          create: {
            connectedAccountId: connectedAccount.id,
            facebookAdAccountId: mAcc.id,
            name: mAcc.name,
            currency: mAcc.currency,
            timezoneName: mAcc.timezone_name,
            accountStatus: mAcc.account_status,
            balance: parseFloat(mAcc.balance || '0'),
            isMock: false,
          },
        });
        createdAdAccounts.push(adAcc);

        // Background sync
        AccountSyncService.syncAdAccount(adAcc.id).catch((e) =>
          console.error(`Error syncing live account ${adAcc.id}:`, e)
        );
      }

      res.json({
        success: true,
        message: `Đã kết nối thành công tài khoản Meta và tìm thấy ${createdAdAccounts.length} tài khoản quảng cáo.`,
        data: {
          connectedAccountId: connectedAccount.id,
          scopes: tokenInfo.scopes,
          hasAdsManagement,
          adAccounts: createdAdAccounts,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async syncAccount(req: Request, res: Response): Promise<void> {
    try {
      const id = String(req.params.id);
      await AccountSyncService.syncAdAccount(id);
      res.json({ success: true, message: 'Đồng bộ dữ liệu thành công' });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async seedMock(req: Request, res: Response): Promise<void> {
    try {
      let user = await prisma.user.findFirst();
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: 'admin@autoadscare.io',
            name: 'Auto Ads Admin',
          },
        });
      }
      const accId = await AccountSyncService.seedMockAccountIfNeeded(user.id);
      res.json({ success: true, message: 'Đã khởi tạo tài khoản Mock Demo', adAccountId: accId });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
