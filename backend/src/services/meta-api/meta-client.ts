import axios, { AxiosError } from 'axios';
import { config } from '../../config/index.js';
import { MetaRawInsight } from './metric-resolver.js';
import { maskToken } from '../../utils/encryption.js';

export interface MetaAdAccount {
  id: string; // "act_12345678"
  name: string;
  account_status: number;
  currency: string;
  timezone_name: string;
  balance?: string;
  spend_cap?: string;
  min_daily_budget?: number;
}

export interface MetaCampaign {
  id: string;
  name: string;
  objective: string;
  status: string;
  effective_status: string;
  buying_type?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export interface MetaAdSet {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  effective_status: string;
  daily_budget?: string;
  lifetime_budget?: string;
  billing_event?: string;
  optimization_goal?: string;
}

export interface MetaAd {
  id: string;
  adset_id: string;
  campaign_id: string;
  name: string;
  status: string;
  effective_status: string;
}

export interface IMetaClient {
  debugToken(accessToken: string): Promise<{
    isValid: boolean;
    scopes: string[];
    expiresAt?: Date;
    userId?: string;
    error?: string;
  }>;
  getAdAccounts(accessToken: string): Promise<MetaAdAccount[]>;
  getCampaigns(adAccountId: string, accessToken: string): Promise<MetaCampaign[]>;
  getAdSets(adAccountId: string, accessToken: string): Promise<MetaAdSet[]>;
  getAds(adAccountId: string, accessToken: string): Promise<MetaAd[]>;
  getInsights(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    datePreset?: string,
    accessToken?: string
  ): Promise<MetaRawInsight | null>;
  getEntityStatus(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    accessToken: string
  ): Promise<{ status: string; effectiveStatus: string }>;
  pauseEntity(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    accessToken: string
  ): Promise<{ success: boolean; effectiveStatus: string; apiResponse: any }>;
}

export class MetaMarketingApiClient implements IMetaClient {
  private baseUrl = `https://graph.facebook.com/${config.metaApiVersion}`;

  private async request<T>(
    endpoint: string,
    params: Record<string, any> = {},
    method: 'GET' | 'POST' = 'GET',
    data: any = null,
    retries = 3
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await axios({
          url,
          method,
          params,
          data,
          timeout: 15000,
          headers: {
            'Content-Type': 'application/json',
          },
        });
        return response.data;
      } catch (err: any) {
        const axiosErr = err as AxiosError<any>;
        const fbError = axiosErr.response?.data?.error;
        const statusCode = axiosErr.response?.status;

        // Rate limit error (Error 17, 32, 613) or HTTP 429
        const isRateLimit =
          statusCode === 429 ||
          fbError?.code === 17 ||
          fbError?.code === 32 ||
          fbError?.code === 613;

        if (isRateLimit && attempt < retries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`[MetaAPI] Rate limited. Backing off for ${delay}ms (attempt ${attempt}/${retries})`);
          await new Promise((res) => setTimeout(res, delay));
          continue;
        }

        // Invalid or expired token (Error 190)
        if (fbError?.code === 190) {
          console.error(`[MetaAPI] OAuth Token Expired/Invalid (Code 190): ${fbError.message}`);
          throw new Error(`Meta OAuth Token Expired/Invalid: ${fbError.message}`);
        }

        console.error(
          `[MetaAPI Error] ${method} ${endpoint} failed: ${fbError?.message || axiosErr.message}`
        );
        throw new Error(fbError?.message || `Meta API request failed with status ${statusCode}`);
      }
    }

    throw new Error(`Meta API request failed after ${retries} attempts`);
  }

  public async debugToken(accessToken: string) {
    try {
      // 1. If App ID and Secret are configured, try /debug_token
      if (config.metaAppId && config.metaAppSecret && config.metaAppId.trim()) {
        try {
          const result = await this.request<any>('/debug_token', {
            input_token: accessToken,
            access_token: `${config.metaAppId}|${config.metaAppSecret}`,
          });

          const data = result.data;
          if (data?.is_valid === true) {
            return {
              isValid: true,
              scopes: data?.scopes || [],
              expiresAt: data?.expires_at ? new Date(data.expires_at * 1000) : undefined,
              userId: data?.user_id,
            };
          }
        } catch (debugErr: any) {
          console.warn('[MetaAPI] /debug_token with App Secret failed, falling back to /me & /me/permissions:', debugErr.message);
        }
      }

      // 2. Direct validation using User Access Token via /me and /me/permissions
      // Works reliably for any User Token from Graph API Explorer without needing META_APP_ID or META_APP_SECRET
      const me = await this.request<any>('/me', {
        fields: 'id,name',
        access_token: accessToken,
      });

      const perms = await this.request<any>('/me/permissions', {
        access_token: accessToken,
      });

      const grantedScopes = (perms.data || [])
        .filter((p: any) => p.status === 'granted')
        .map((p: any) => p.permission);

      return {
        isValid: true,
        scopes: grantedScopes,
        userId: me.id,
      };
    } catch (err: any) {
      return {
        isValid: false,
        scopes: [],
        error: err.message,
      };
    }
  }

  public async getAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
    const res = await this.request<any>('/me/adaccounts', {
      fields: 'id,name,account_status,currency,timezone_name,balance,spend_cap,min_daily_budget',
      access_token: accessToken,
      limit: 50,
    });
    return res.data || [];
  }

  public async getCampaigns(adAccountId: string, accessToken: string): Promise<MetaCampaign[]> {
    const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const res = await this.request<any>(`/${formattedId}/campaigns`, {
      fields: 'id,name,objective,status,effective_status,buying_type,daily_budget,lifetime_budget',
      access_token: accessToken,
      limit: 100,
    });
    return res.data || [];
  }

  public async getAdSets(adAccountId: string, accessToken: string): Promise<MetaAdSet[]> {
    const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const res = await this.request<any>(`/${formattedId}/adsets`, {
      fields:
        'id,campaign_id,name,status,effective_status,daily_budget,lifetime_budget,billing_event,optimization_goal',
      access_token: accessToken,
      limit: 100,
    });
    return res.data || [];
  }

  public async getAds(adAccountId: string, accessToken: string): Promise<MetaAd[]> {
    const formattedId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
    const res = await this.request<any>(`/${formattedId}/ads`, {
      fields: 'id,adset_id,campaign_id,name,status,effective_status',
      access_token: accessToken,
      limit: 100,
    });
    return res.data || [];
  }

  public async getInsights(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    datePreset = 'today',
    accessToken?: string
  ): Promise<MetaRawInsight | null> {
    const res = await this.request<any>(`/${entityId}/insights`, {
      fields: 'spend,impressions,clicks,cpm,cpc,ctr,actions,cost_per_action_type',
      date_preset: datePreset.toLowerCase(),
      level,
      access_token: accessToken,
    });

    if (res.data && res.data.length > 0) {
      return res.data[0];
    }
    return null;
  }

  public async getEntityStatus(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    accessToken: string
  ): Promise<{ status: string; effectiveStatus: string }> {
    const res = await this.request<any>(`/${entityId}`, {
      fields: 'id,status,effective_status',
      access_token: accessToken,
    });
    return {
      status: res.status,
      effectiveStatus: res.effective_status,
    };
  }

  /**
   * Pause Campaign, AdSet, or Ad via Graph API.
   * Includes verification step.
   */
  public async pauseEntity(
    entityId: string,
    level: 'campaign' | 'adset' | 'ad',
    accessToken: string
  ): Promise<{ success: boolean; effectiveStatus: string; apiResponse: any }> {
    console.log(`[MetaAPI Write] Pausing ${level} ID: ${entityId} with token: ${maskToken(accessToken)}`);

    const res = await this.request<any>(
      `/${entityId}`,
      { access_token: accessToken },
      'POST',
      { status: 'PAUSED' }
    );

    if (res.success !== true) {
      throw new Error(`Meta API returned unexpected response for pause: ${JSON.stringify(res)}`);
    }

    // Post-action verification
    const verified = await this.getEntityStatus(entityId, level, accessToken);
    const isPaused = verified.status === 'PAUSED' || verified.effectiveStatus.includes('PAUSED');

    return {
      success: isPaused,
      effectiveStatus: verified.effectiveStatus,
      apiResponse: res,
    };
  }
}
