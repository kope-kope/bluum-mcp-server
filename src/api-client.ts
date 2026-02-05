import axios, { AxiosInstance, AxiosError } from 'axios';
import { Config, getBaseUrl } from './config.js';

/**
 * Filter options for listing positions
 */
export interface PositionFilters {
  symbol?: string;
  non_zero_only?: boolean;
  refresh_prices?: boolean;
}

/**
 * Filter options for listing orders
 */
export interface OrderFilters {
  status?: 'accepted' | 'filled' | 'partially_filled' | 'canceled' | 'rejected';
  symbol?: string;
  side?: 'buy' | 'sell';
  limit?: number;
  offset?: number;
}

/**
 * Order request payload
 */
export interface OrderRequest {
  symbol: string;
  qty: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  time_in_force: 'day' | 'gtc';
  limit_price?: string;
  client_order_id?: string;
  commission?: string;
  commission_type?: 'notional' | 'qty' | 'bps';
}

/**
 * Filter options for asset search
 */
export interface AssetSearchFilters {
  status?: 'active' | 'inactive';
  asset_class?: 'us_equity' | 'crypto';
  tradable?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Filter options for listing transactions
 */
export interface TransactionFilters {
  type?: 'deposit' | 'withdrawal';
  status?: 'pending' | 'processing' | 'settled' | 'failed' | 'canceled';
  funding_type?: 'fiat' | 'crypto';
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

/**
 * Fund request payload
 */
export interface FundRequest {
  amount: string;
  funding_details: FiatFundingDetails | CryptoFundingDetails;
  description?: string;
  external_reference_id?: string;
}

export interface FiatFundingDetails {
  funding_type: 'fiat';
  fiat_currency: 'USD';
  bank_account_id: string;
  method: 'ach' | 'wire';
}

export interface CryptoFundingDetails {
  funding_type: 'crypto';
  crypto_asset: 'BTC' | 'ETH' | 'USDC' | 'USDT';
  wallet_address: string;
  network: 'Bitcoin' | 'Ethereum' | 'Polygon';
}

/**
 * Bluum API Client
 * Handles authentication and HTTP requests to the Bluum Finance API
 */
export class BluumApiClient {
  private client: AxiosInstance;

  constructor(config: Config) {
    const baseURL = getBaseUrl(config);

    // Create Basic Auth header
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString('base64');

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for better error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const errorData = error.response.data as any;
          const message = errorData?.message || error.message;
          const code = errorData?.code || error.response.status;
          throw new Error(`Bluum API Error ${code}: ${message}`);
        }
        throw new Error(`Network error: ${error.message}`);
      }
    );
  }

  // ===== Position Operations =====

  async listPositions(accountId: string, filters?: PositionFilters) {
    const { data } = await this.client.get(
      `/trading/accounts/${accountId}/positions`,
      { params: filters }
    );
    return data;
  }

  async getPosition(accountId: string, positionId: string, refreshPrices = false) {
    const { data } = await this.client.get(
      `/trading/accounts/${accountId}/positions/${positionId}`,
      { params: { refresh_prices: refreshPrices } }
    );
    return data;
  }

  // ===== Order Operations =====

  async listOrders(accountId: string, filters?: OrderFilters) {
    const { data } = await this.client.get(
      `/trading/accounts/${accountId}/orders`,
      { params: filters }
    );
    return data;
  }

  async createOrder(accountId: string, order: OrderRequest) {
    const { data } = await this.client.post(
      `/trading/accounts/${accountId}/orders`,
      order
    );
    return data;
  }

  async getOrder(orderId: string) {
    const { data } = await this.client.get(`/trading/orders/${orderId}`);
    return data;
  }

  // ===== Asset Operations =====

  async listAssets(filters?: { asset_class?: 'us_equity' | 'crypto'; tradable?: boolean }) {
    const { data } = await this.client.get('/assets', { params: filters });
    return data;
  }

  async searchAssets(query?: string, filters?: AssetSearchFilters) {
    const { data } = await this.client.get('/assets/search', {
      params: { q: query, ...filters }
    });
    return data;
  }

  // ===== Wallet Operations =====

  async listTransactions(accountId: string, filters?: TransactionFilters) {
    const { data } = await this.client.get(
      `/wallet/accounts/${accountId}/transactions`,
      { params: filters }
    );
    return data;
  }

  async fundAccount(accountId: string, fundRequest: FundRequest) {
    const { data } = await this.client.post(
      `/wallet/accounts/${accountId}/funding`,
      fundRequest
    );
    return data;
  }

  async withdrawFunds(fundRequest: FundRequest) {
    const { data } = await this.client.post('/wallet/withdrawals', fundRequest);
    return data;
  }

  // ===== Account Operations =====

  async listAccounts() {
    const { data } = await this.client.get('/accounts');
    return data;
  }

  async getAccount(accountId: string) {
    const { data } = await this.client.get(`/accounts/${accountId}`);
    return data;
  }
}
