import axios from 'axios';
import prisma from '../../db.js';
import { MetaService } from '../meta-api/meta-service.js';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  isEnabled: boolean;
  periodicEnabled: boolean;
  periodicIntervalMinutes: number; // e.g. 5, 15, 30
}

export class TelegramService {
  private static pollingActive = false;
  private static lastUpdateId = 0;
  private static pollTimer: NodeJS.Timeout | null = null;
  private static isCheckingReport = false;

  /**
   * Get Telegram configuration from SystemSetting or ENV fallback
   */
  public static async getConfig(): Promise<TelegramConfig> {
    const settings = await prisma.systemSetting.findMany({
      where: {
        key: {
          in: [
            'TELEGRAM_BOT_TOKEN',
            'TELEGRAM_CHAT_ID',
            'TELEGRAM_ENABLED',
            'TELEGRAM_PERIODIC_ENABLED',
            'TELEGRAM_PERIODIC_INTERVAL',
          ],
        },
      },
    });

    const map = new Map(settings.map((s) => [s.key, s.value]));

    const botToken = map.get('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN || '';
    const chatId = map.get('TELEGRAM_CHAT_ID') || process.env.TELEGRAM_CHAT_ID || '';
    const isEnabled = map.get('TELEGRAM_ENABLED') !== undefined
      ? map.get('TELEGRAM_ENABLED') === 'true'
      : Boolean(botToken && chatId);
    const periodicEnabled = map.get('TELEGRAM_PERIODIC_ENABLED') === 'true';
    const periodicIntervalMinutes = parseInt(map.get('TELEGRAM_PERIODIC_INTERVAL') || '5', 10);

    return {
      botToken,
      chatId,
      isEnabled,
      periodicEnabled,
      periodicIntervalMinutes: periodicIntervalMinutes || 5,
    };
  }

  /**
   * Update Telegram settings
   */
  public static async updateConfig(newConfig: Partial<TelegramConfig>): Promise<TelegramConfig> {
    const updates: Array<{ key: string; value: string; description?: string }> = [];

    if (newConfig.botToken !== undefined) {
      updates.push({
        key: 'TELEGRAM_BOT_TOKEN',
        value: newConfig.botToken.trim(),
        description: 'Telegram Bot Token from @BotFather',
      });
    }
    if (newConfig.chatId !== undefined) {
      updates.push({
        key: 'TELEGRAM_CHAT_ID',
        value: newConfig.chatId.trim(),
        description: 'Telegram Chat ID or Group ID',
      });
    }
    if (newConfig.isEnabled !== undefined) {
      updates.push({
        key: 'TELEGRAM_ENABLED',
        value: String(newConfig.isEnabled),
        description: 'Enable or disable Telegram notifications',
      });
    }
    if (newConfig.periodicEnabled !== undefined) {
      updates.push({
        key: 'TELEGRAM_PERIODIC_ENABLED',
        value: String(newConfig.periodicEnabled),
        description: 'Enable periodic status reports',
      });
    }
    if (newConfig.periodicIntervalMinutes !== undefined) {
      updates.push({
        key: 'TELEGRAM_PERIODIC_INTERVAL',
        value: String(newConfig.periodicIntervalMinutes),
        description: 'Periodic report interval in minutes (e.g. 5, 15, 30)',
      });
    }

    for (const item of updates) {
      await prisma.systemSetting.upsert({
        where: { key: item.key },
        update: { value: item.value },
        create: item,
      });
    }

    const updated = await this.getConfig();

    // Restart or adjust polling
    if (updated.isEnabled && updated.botToken) {
      this.startPolling();
    } else {
      this.stopPolling();
    }

    return updated;
  }

  /**
   * Send a raw message to Telegram
   */
  public static async sendMessage(text: string, replyMarkup?: any): Promise<boolean> {
    try {
      const cfg = await this.getConfig();
      if (!cfg.isEnabled || !cfg.botToken || !cfg.chatId) {
        return false;
      }

      const url = `https://api.telegram.org/bot${cfg.botToken}/sendMessage`;
      const body: any = {
        chat_id: cfg.chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      };

      if (replyMarkup) {
        body.reply_markup = replyMarkup;
      }

      const res = await axios.post(url, body, { timeout: 10000 });
      return res.data?.ok === true;
    } catch (err: any) {
      console.error('[TelegramService Error] Failed to send message:', err.response?.data || err.message);
      return false;
    }
  }

  /**
   * Send an immediate alert when an Ad/AdSet/Campaign is paused
   */
  public static async sendPauseAlert(payload: {
    entityType: 'CAMPAIGN' | 'ADSET' | 'AD';
    entityName: string;
    entityId: string;
    reason: string;
    adAccountId: string;
    isDryRun: boolean;
  }): Promise<boolean> {
    const typeLabel =
      payload.entityType === 'CAMPAIGN'
        ? 'Chiến Dịch'
        : payload.entityType === 'ADSET'
        ? 'Nhóm Quảng Cáo'
        : 'Quảng Cáo';

    const nowStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    if (payload.isDryRun) {
      const text =
        `🛡️ <b>[AUTO ADS CARE — THỬ NGHIỆM DRY RUN]</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `⚠️ <b>Dự kiến tắt:</b> ${typeLabel} <i>${payload.entityName}</i>\n` +
        `🆔 <b>ID:</b> <code>${payload.entityId}</code>\n` +
        `💰 <b>Lý do:</b> ${payload.reason}\n` +
        `⏰ <b>Thời gian:</b> ${nowStr}\n` +
        `ℹ️ <i>(Chưa can thiệp Facebook thật vì đang ở chế độ Dry Run)</i>`;

      const replyMarkup = {
        inline_keyboard: [
          [
            {
              text: `🔴 Bấm tắt thật trên Facebook ngay`,
              callback_data: `pause:${payload.entityType.toLowerCase()}:${payload.entityId}:${payload.adAccountId}`,
            },
          ],
        ],
      };

      return this.sendMessage(text, replyMarkup);
    }

    const text =
      `🚨 <b>[BOT TỰ ĐỘNG TẮT — PHÁT HIỆN VI PHẠM]</b>\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `🎯 <b>Đối tượng:</b> [${typeLabel}] <b>${payload.entityName}</b>\n` +
      `🆔 <b>ID:</b> <code>${payload.entityId}</code>\n` +
      `⚠️ <b>Lý do vi phạm:</b> ${payload.reason}\n` +
      `⏰ <b>Thời gian:</b> ${nowStr}\n` +
      `🛡️ <b>Trạng thái:</b> Bot đã tự động gửi lệnh TẠM DỪNG (PAUSED) lên Facebook theo đúng quy tắc đã cài!`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: `🟢 Bật lại đối tượng này`,
            callback_data: `resume:${payload.entityType.toLowerCase()}:${payload.entityId}:${payload.adAccountId}`,
          },
          {
            text: `🛑 Dừng khẩn cấp bot`,
            callback_data: `emergency:stop`,
          },
        ],
      ],
    };

    return this.sendMessage(text, replyMarkup);
  }

  /**
   * Send notification when an entity is manually paused or resumed from the tool
   */
  public static async sendManualActionAlert(payload: {
    entityType: 'CAMPAIGN' | 'ADSET' | 'AD';
    entityName: string;
    entityId: string;
    status: 'ACTIVE' | 'PAUSED';
    adAccountId: string;
  }): Promise<boolean> {
    const typeLabel =
      payload.entityType === 'CAMPAIGN'
        ? 'Chiến Dịch'
        : payload.entityType === 'ADSET'
        ? 'Nhóm Quảng Cáo'
        : 'Quảng Cáo';

    const nowStr = new Date().toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const isPaused = payload.status === 'PAUSED';

    const text = isPaused
      ? `🎛️ <b>[THAO TÁC THỦ CÔNG TỪ TOOL — ĐÃ TẮT ADS]</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 <b>Đối tượng:</b> [${typeLabel}] <b>${payload.entityName}</b>\n` +
        `🆔 <b>ID:</b> <code>${payload.entityId}</code>\n` +
        `👤 <b>Hành động:</b> Bạn đã bấm <b>TẠM DỪNG (TẮT)</b> trực tiếp trên giao diện web\n` +
        `⏰ <b>Thời gian:</b> ${nowStr}\n` +
        `⏸️ <b>Trạng thái:</b> Đã gửi lệnh TẠM DỪNG (PAUSED) lên Facebook`
      : `🟢 <b>[THAO TÁC THỦ CÔNG TỪ TOOL — ĐÃ BẬT LẠI]</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🎯 <b>Đối tượng:</b> [${typeLabel}] <b>${payload.entityName}</b>\n` +
        `🆔 <b>ID:</b> <code>${payload.entityId}</code>\n` +
        `👤 <b>Hành động:</b> Bạn đã bấm <b>BẬT LẠI</b> trực tiếp trên giao diện web\n` +
        `⏰ <b>Thời gian:</b> ${nowStr}\n` +
        `▶️ <b>Trạng thái:</b> Đã kích hoạt ĐANG CHẠY (ACTIVE) trên Facebook`;

    const replyMarkup = isPaused
      ? {
          inline_keyboard: [
            [
              {
                text: `🟢 Bật lại đối tượng này`,
                callback_data: `resume:${payload.entityType.toLowerCase()}:${payload.entityId}:${payload.adAccountId}`,
              },
            ],
          ],
        }
      : {
          inline_keyboard: [
            [
              {
                text: `🔴 Tắt đối tượng này`,
                callback_data: `pause:${payload.entityType.toLowerCase()}:${payload.entityId}:${payload.adAccountId}`,
              },
            ],
          ],
        };

    return this.sendMessage(text, replyMarkup);
  }

  /**
   * Build and send periodic status report (e.g. every 5 mins)
   */
  public static async sendPeriodicReport(): Promise<boolean> {
    try {
      const adAccount = await prisma.adAccount.findFirst({
        where: {
          isMonitored: true,
          isMock: false,
          NOT: { name: { contains: '[MOCK]' } },
        },
      });

      if (!adAccount) return false;



      // Calculate totals for TODAY
      const metrics = await prisma.performanceMetric.findMany({
        where: {
          adAccountId: adAccount.id,
          datePreset: 'TODAY',
          entityType: 'CAMPAIGN',
        },
      });

      let totalSpend = 0;
      let totalMessages = 0;
      for (const m of metrics) {
        totalSpend += m.spend || 0;
        totalMessages += m.messagingConversations || 0;
      }

      const cpa = totalMessages > 0 ? Math.round(totalSpend / totalMessages) : 0;

      const activeCampaigns = await prisma.campaignSnapshot.count({
        where: { adAccountId: adAccount.id, status: 'ACTIVE' },
      });

      const pausedCampaigns = await prisma.campaignSnapshot.count({
        where: { adAccountId: adAccount.id, status: 'PAUSED' },
      });

      const systemEmergencyStop = await prisma.systemSetting.findUnique({
        where: { key: 'EMERGENCY_STOP' },
      });
      const isEmergency = systemEmergencyStop?.value === 'true';

      const nowStr = new Date().toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      });

      const text =
        `📊 <b>[BÁO CÁO ADS ĐỊNH KỲ — ${nowStr}]</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `🏢 <b>Tài khoản:</b> ${adAccount.name}\n` +
        `💸 <b>Tiền tiêu hôm nay:</b> <b>${Math.round(totalSpend).toLocaleString('vi-VN')} đ</b>\n` +
        `💬 <b>Tổng tin nhắn:</b> <b>${totalMessages} tin</b>\n` +
        `🎯 <b>CPA trung bình:</b> <b>${cpa > 0 ? cpa.toLocaleString('vi-VN') + ' đ' : '—'}</b>\n` +
        `🟢 <b>Đang chạy:</b> ${activeCampaigns} camp  |  ⏸️ <b>Tạm dừng:</b> ${pausedCampaigns} camp\n` +
        `🛡️ <b>Dừng khẩn cấp:</b> ${isEmergency ? '🚨 ĐANG BẬT' : '🟢 Bình thường'}\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
        `💡 <i>Gõ /stop5m để tắt báo định kỳ | /status để xem lại</i>`;

      const replyMarkup = {
        inline_keyboard: [
          [
            { text: '🔄 Cập nhật ngay', callback_data: 'cmd:status' },
            {
              text: isEmergency ? '🟢 Tắt dừng khẩn cấp' : '🛑 Dừng khẩn cấp',
              callback_data: isEmergency ? 'emergency:resume' : 'emergency:stop',
            },
          ],
          [
            { text: '🔕 Tắt báo 5 phút', callback_data: 'toggle:periodic_off' },
          ],
        ],
      };

      return this.sendMessage(text, replyMarkup);
    } catch (err: any) {
      console.error('[TelegramService Periodic Error]:', err.message);
      return false;
    }
  }

  /**
   * Check if it's time to send periodic report (called every minute by CareScheduler)
   */
  public static async checkPeriodicReport(): Promise<void> {
    if (this.isCheckingReport) return;
    this.isCheckingReport = true;

    try {
      const cfg = await this.getConfig();
      if (!cfg.isEnabled || !cfg.periodicEnabled || !cfg.botToken || !cfg.chatId) {
        return;
      }

      const lastSetting = await prisma.systemSetting.findUnique({
        where: { key: 'TELEGRAM_LAST_PERIODIC_AT' },
      });

      const now = Date.now();
      if (lastSetting && lastSetting.value) {
        const lastTime = parseInt(lastSetting.value, 10);
        const minutesDiff = (now - lastTime) / (1000 * 60);
        if (minutesDiff < cfg.periodicIntervalMinutes) {
          return; // Interval not reached yet
        }
      }

      // Time to send!
      await this.sendPeriodicReport();

      // Record last time
      await prisma.systemSetting.upsert({
        where: { key: 'TELEGRAM_LAST_PERIODIC_AT' },
        update: { value: String(now) },
        create: {
          key: 'TELEGRAM_LAST_PERIODIC_AT',
          value: String(now),
          description: 'Last timestamp periodic report was sent',
        },
      });
    } catch (err: any) {
      console.error('[Telegram Periodic Check Error]:', err.message);
    } finally {
      this.isCheckingReport = false;
    }
  }

  /**
   * Test sending a sample message to verify Token & Chat ID
   */
  public static async testConnection(token?: string, chat?: string): Promise<{ success: boolean; message: string }> {
    const cfg = await this.getConfig();
    const botToken = token?.trim() || cfg.botToken;
    const chatId = chat?.trim() || cfg.chatId;

    if (!botToken || !chatId) {
      return { success: false, message: 'Vui lòng cung cấp cả Bot Token và Chat ID' };
    }

    try {
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
      const res = await axios.post(
        url,
        {
          chat_id: chatId,
          text:
            `🎉 <b>KẾT NỐI TELEGRAM THÀNH CÔNG!</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Hệ thống <b>Auto Ads Care</b> đã liên kết thành công với điện thoại của bạn.\n` +
            `Từ giờ bot sẽ tự động gửi cảnh báo và cho phép bạn <b>Tắt/Bật ads trực tiếp</b> ngay tại Telegram này!`,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              [
                { text: '📊 Thử xem trạng thái', callback_data: 'cmd:status' },
              ],
            ],
          },
        },
        { timeout: 10000 }
      );

      if (res.data?.ok) {
        return { success: true, message: 'Đã gửi tin nhắn thử nghiệm thành công! Hãy kiểm tra Telegram trên điện thoại của bạn.' };
      }
      return { success: false, message: `Telegram trả về lỗi: ${JSON.stringify(res.data)}` };
    } catch (err: any) {
      return {
        success: false,
        message: err.response?.data?.description || err.message,
      };
    }
  }

  /**
   * Start Telegram Long Polling to listen for button clicks & commands from mobile
   */
  public static startPolling(): void {
    if (this.pollingActive) return;
    this.pollingActive = true;
    console.log('[Telegram Polling] Starting mobile remote control listener...');
    this.pollLoop();
  }

  /**
   * Stop polling
   */
  public static stopPolling(): void {
    this.pollingActive = false;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    console.log('[Telegram Polling] Stopped mobile listener.');
  }

  private static async pollLoop(): Promise<void> {
    if (!this.pollingActive) return;

    try {
      const cfg = await this.getConfig();
      if (!cfg.isEnabled || !cfg.botToken) {
        this.pollTimer = setTimeout(() => this.pollLoop(), 5000);
        return;
      }

      const url = `https://api.telegram.org/bot${cfg.botToken}/getUpdates`;
      const res = await axios.get(url, {
        params: {
          offset: this.lastUpdateId + 1,
          timeout: 10,
        },
        timeout: 15000,
      });

      if (res.data?.ok && Array.isArray(res.data.result)) {
        for (const update of res.data.result) {
          this.lastUpdateId = update.update_id;
          await this.handleUpdate(update, cfg);
        }
      }
    } catch (err: any) {
      // Ignore network timeouts in long polling
    }

    if (this.pollingActive) {
      this.pollTimer = setTimeout(() => this.pollLoop(), 2000);
    }
  }

  /**
   * Handle incoming message or button click from Telegram
   */
  private static async handleUpdate(update: any, cfg: TelegramConfig): Promise<void> {
    try {
      // 1. Handle Inline Button Click (callback_query)
      if (update.callback_query) {
        const cq = update.callback_query;
        const data = cq.data as string;
        const callbackId = cq.id;

        // Answer callback query quickly
        const ackUrl = `https://api.telegram.org/bot${cfg.botToken}/answerCallbackQuery`;

        if (data.startsWith('pause:')) {
          // Format: pause:level:entityId:adAccountId
          const [, level, entityId, adAccountId] = data.split(':');
          await axios.post(ackUrl, { callback_query_id: callbackId, text: '⏳ Đang gửi lệnh tắt lên Meta...' }).catch(() => {});

          const { client, accessToken } = await MetaService.getClientForAccount(adAccountId);
          await client.updateEntityStatus(entityId, level as any, 'PAUSED', accessToken);

          // Update local snapshot
          if (level === 'campaign') {
            await prisma.campaignSnapshot.updateMany({ where: { fbCampaignId: entityId }, data: { status: 'PAUSED' } });
          } else if (level === 'adset') {
            await prisma.adSetSnapshot.updateMany({ where: { fbAdSetId: entityId }, data: { status: 'PAUSED' } });
          } else {
            await prisma.adSnapshot.updateMany({ where: { fbAdId: entityId }, data: { status: 'PAUSED' } });
          }

          await this.sendMessage(`✅ <b>ĐÃ TẮT THÀNH CÔNG!</b>\nĐối tượng <code>${entityId}</code> (${level}) đã được chuyển sang <b>PAUSED</b> trên Facebook theo lệnh từ điện thoại của bạn.`);
        } else if (data.startsWith('resume:')) {
          const [, level, entityId, adAccountId] = data.split(':');
          await axios.post(ackUrl, { callback_query_id: callbackId, text: '⏳ Đang kích hoạt chạy lại...' }).catch(() => {});

          const { client, accessToken } = await MetaService.getClientForAccount(adAccountId);
          await client.updateEntityStatus(entityId, level as any, 'ACTIVE', accessToken);

          if (level === 'campaign') {
            await prisma.campaignSnapshot.updateMany({ where: { fbCampaignId: entityId }, data: { status: 'ACTIVE' } });
          } else if (level === 'adset') {
            await prisma.adSetSnapshot.updateMany({ where: { fbAdSetId: entityId }, data: { status: 'ACTIVE' } });
          } else {
            await prisma.adSnapshot.updateMany({ where: { fbAdId: entityId }, data: { status: 'ACTIVE' } });
          }

          await this.sendMessage(`🟢 <b>ĐÃ BẬT LẠI THÀNH CÔNG!</b>\nĐối tượng <code>${entityId}</code> đã chạy lại trên Facebook.`);
        } else if (data === 'emergency:stop') {
          await axios.post(ackUrl, { callback_query_id: callbackId, text: '🛑 Đang kích hoạt Emergency Stop!' }).catch(() => {});
          await prisma.systemSetting.upsert({
            where: { key: 'EMERGENCY_STOP' },
            update: { value: 'true' },
            create: { key: 'EMERGENCY_STOP', value: 'true', description: 'Global Emergency Stop Kill Switch' },
          });
          await this.sendMessage(`🚨 <b>EMERGENCY STOP ĐÃ BẬT!</b>\nToàn bộ các lệnh tự động tắt ads đã bị đóng băng 100%.`);
        } else if (data === 'emergency:resume') {
          await axios.post(ackUrl, { callback_query_id: callbackId, text: '🟢 Đang tắt Emergency Stop...' }).catch(() => {});
          await prisma.systemSetting.upsert({
            where: { key: 'EMERGENCY_STOP' },
            update: { value: 'false' },
            create: { key: 'EMERGENCY_STOP', value: 'false', description: 'Global Emergency Stop Kill Switch' },
          });
          await this.sendMessage(`🟢 <b>EMERGENCY STOP ĐÃ TẮT!</b>\nBot đã quay lại trạng thái canh ads bình thường.`);
        } else if (data === 'toggle:periodic_off') {
          await axios.post(ackUrl, { callback_query_id: callbackId, text: '🔕 Đã tắt báo cáo định kỳ' }).catch(() => {});
          await this.updateConfig({ periodicEnabled: false });
          await this.sendMessage(`🔕 <b>Đã tắt thông báo định kỳ 5 phút!</b>\nBot sẽ chỉ gửi tin nhắn khi có ads bị vi phạm hoặc bị tắt. Khi nào muốn bật lại, hãy gõ <code>/start5m</code>.`);
        } else if (data === 'cmd:status') {
          await axios.post(ackUrl, { callback_query_id: callbackId, text: 'Đang tải số liệu...' }).catch(() => {});
          await this.sendPeriodicReport();
        }
        return;
      }

      // 2. Handle Text Command from Telegram
      if (update.message?.text) {
        const text = update.message.text.trim().toLowerCase();

        if (text === '/start' || text === '/help') {
          const helpMsg =
            `🤖 <b>AUTO ADS CARE — ĐIỀU KHIỂN TỪ XA QUA ĐIỆN THOẠI</b>\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━\n` +
            `Các lệnh bạn có thể nhắn trực tiếp:\n\n` +
            `📊 <code>/status</code>: Xem báo cáo số liệu Ads tức thì\n` +
            `🔕 <code>/stop5m</code>: Tắt thông báo định kỳ 5 phút (Chỉ báo khi tắt ads)\n` +
            `🔔 <code>/start5m</code>: Bật lại thông báo định kỳ 5 phút\n` +
            `🛑 <code>/emergency</code>: Bật/Tắt nút Dừng Khẩn Cấp khẩn cấp\n\n` +
            `<i>Mỗi khi bot tự động tắt ads, nút bấm 🔴 Tắt hoặc 🟢 Bật lại sẽ hiển thị ngay dưới tin nhắn để bạn bấm trực tiếp trên điện thoại!</i>`;
          await this.sendMessage(helpMsg);
        } else if (text === '/status') {
          const sent = await this.sendPeriodicReport();
          if (!sent) {
            await this.sendMessage('⚠️ <b>Chưa có tài khoản Facebook Ads nào được kết nối!</b>\nVui lòng vào giao diện Auto Ads Care trên web và bấm "+ Kết Nối Tài Khoản Thật (Live)".');
          }
        } else if (text === '/stop5m') {

          await this.updateConfig({ periodicEnabled: false });
          await this.sendMessage(`🔕 <b>Đã tắt thông báo định kỳ 5 phút!</b>\nBot sẽ chỉ nhắn tin khi có nhóm ads vi phạm hoặc bị tắt.`);
        } else if (text === '/start5m') {
          await this.updateConfig({ periodicEnabled: true, periodicIntervalMinutes: 5 });
          await this.sendMessage(`🔔 <b>Đã bật lại thông báo định kỳ 5 phút 1 lần!</b>`);
          await this.sendPeriodicReport();
        } else if (text === '/emergency') {
          const curr = await prisma.systemSetting.findUnique({ where: { key: 'EMERGENCY_STOP' } });
          const isNow = curr?.value === 'true';
          const nextVal = !isNow;
          await prisma.systemSetting.upsert({
            where: { key: 'EMERGENCY_STOP' },
            update: { value: String(nextVal) },
            create: { key: 'EMERGENCY_STOP', value: String(nextVal), description: 'Emergency Stop' },
          });
          await this.sendMessage(
            nextVal
              ? `🚨 <b>ĐÃ BẬT DỪNG KHẨN CẤP (EMERGENCY STOP)!</b>\nToàn bộ hành động tắt ads đã bị đóng băng.`
              : `🟢 <b>ĐÃ TẮT DỪNG KHẨN CẤP!</b>\nBot đã tiếp tục canh camp bình thường.`
          );
        }
      }
    } catch (err: any) {
      console.error('[Telegram HandleUpdate Error]:', err.message);
    }
  }
}
