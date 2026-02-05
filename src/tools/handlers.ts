import { BluumApiClient } from '../api-client.js';
import * as schemas from './schemas.js';

/**
 * Create tool handlers that validate inputs and call the API client
 */
export function createToolHandlers(apiClient: BluumApiClient) {
  return {
    // ===== Position Tools =====

    list_positions: async (input: unknown) => {
      const params = schemas.ListPositionsInputSchema.parse(input);
      const { account_id, ...filters } = params;
      const positions = await apiClient.listPositions(account_id, filters);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(positions, null, 2),
        }],
      };
    },

    get_position: async (input: unknown) => {
      const params = schemas.GetPositionInputSchema.parse(input);
      const position = await apiClient.getPosition(
        params.account_id,
        params.position_id,
        params.refresh_prices
      );

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(position, null, 2),
        }],
      };
    },

    // ===== Order Tools =====

    list_orders: async (input: unknown) => {
      const params = schemas.ListOrdersInputSchema.parse(input);
      const { account_id, ...filters } = params;
      const orders = await apiClient.listOrders(account_id, filters);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(orders, null, 2),
        }],
      };
    },

    create_order: async (input: unknown) => {
      const params = schemas.CreateOrderInputSchema.parse(input);
      const { account_id, ...orderData } = params;
      const order = await apiClient.createOrder(account_id, orderData);

      return {
        content: [{
          type: 'text' as const,
          text: `Order created successfully!\n\n${JSON.stringify(order, null, 2)}`,
        }],
      };
    },

    get_order_status: async (input: unknown) => {
      const params = schemas.GetOrderInputSchema.parse(input);
      const order = await apiClient.getOrder(params.order_id);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(order, null, 2),
        }],
      };
    },

    // ===== Asset Tools =====

    list_assets: async (input: unknown) => {
      const params = schemas.ListAssetsInputSchema.parse(input);
      const assets = await apiClient.listAssets(params);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(assets, null, 2),
        }],
      };
    },

    search_assets: async (input: unknown) => {
      const params = schemas.SearchAssetsInputSchema.parse(input);
      const { q, ...filters } = params;
      const assets = await apiClient.searchAssets(q, filters);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(assets, null, 2),
        }],
      };
    },

    // ===== Wallet Tools =====

    list_transactions: async (input: unknown) => {
      const params = schemas.ListTransactionsInputSchema.parse(input);
      const { account_id, ...filters } = params;
      const transactions = await apiClient.listTransactions(account_id, filters);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(transactions, null, 2),
        }],
      };
    },

    fund_account: async (input: unknown) => {
      const params = schemas.FundAccountInputSchema.parse(input);
      const { account_id, ...fundRequest } = params;
      const transaction = await apiClient.fundAccount(account_id, fundRequest);

      return {
        content: [{
          type: 'text' as const,
          text: `Funding request submitted successfully!\n\n${JSON.stringify(transaction, null, 2)}`,
        }],
      };
    },

    withdraw_funds: async (input: unknown) => {
      const params = schemas.WithdrawFundsInputSchema.parse(input);
      // Note: withdraw endpoint doesn't take account_id in path, it's in the request body
      const transaction = await apiClient.withdrawFunds(params);

      return {
        content: [{
          type: 'text' as const,
          text: `Withdrawal request submitted successfully!\n\n${JSON.stringify(transaction, null, 2)}`,
        }],
      };
    },

    // ===== Account Tools =====

    list_accounts: async (input: unknown) => {
      schemas.ListAccountsInputSchema.parse(input);
      const accounts = await apiClient.listAccounts();

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(accounts, null, 2),
        }],
      };
    },

    get_account: async (input: unknown) => {
      const params = schemas.GetAccountInputSchema.parse(input);
      const account = await apiClient.getAccount(params.account_id);

      return {
        content: [{
          type: 'text' as const,
          text: JSON.stringify(account, null, 2),
        }],
      };
    },
  };
}

export type ToolHandlers = ReturnType<typeof createToolHandlers>;
