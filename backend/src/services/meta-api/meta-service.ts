import { IMetaClient, MetaMarketingApiClient } from './meta-client.js';
import { MockMetaMarketingApiClient } from './mock-meta-client.js';
import { decryptToken } from '../../utils/encryption.js';
import prisma from '../../db.js';

export class MetaService {
  private static liveClient = new MetaMarketingApiClient();
  private static mockClient = new MockMetaMarketingApiClient();

  public static getMockClient(): MockMetaMarketingApiClient {
    return this.mockClient;
  }

  public static getLiveClient(): MetaMarketingApiClient {
    return this.liveClient;
  }

  /**
   * Get the appropriate client and resolved access token for an Ad Account.
   */
  public static async getClientForAccount(adAccountId: string): Promise<{
    client: IMetaClient;
    accessToken: string;
    isMock: boolean;
    fbAccountId: string;
  }> {
    const adAccount = await prisma.adAccount.findUnique({
      where: { id: adAccountId },
      include: { connectedAccount: true },
    });

    if (!adAccount) {
      throw new Error(`Ad Account not found: ${adAccountId}`);
    }

    if (adAccount.isMock || adAccount.connectedAccount.isMock) {
      return {
        client: this.mockClient,
        accessToken: 'mock_access_token_demo',
        isMock: true,
        fbAccountId: adAccount.facebookAdAccountId,
      };
    }

    // Decrypt real token
    const encryptedToken = adAccount.connectedAccount.accessTokenEncrypted;
    if (!encryptedToken) {
      throw new Error(`Connected account ${adAccount.connectedAccountId} has no valid access token`);
    }

    const plainToken = decryptToken(encryptedToken);
    return {
      client: this.liveClient,
      accessToken: plainToken,
      isMock: false,
      fbAccountId: adAccount.facebookAdAccountId,
    };
  }
}
