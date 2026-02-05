import { z } from 'zod';

// ===== Position Schemas =====

export const ListPositionsInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID format'),
  symbol: z.string().optional(),
  non_zero_only: z.boolean().default(false),
  refresh_prices: z.boolean().default(false),
});

export const GetPositionInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID format'),
  position_id: z.string().uuid('Invalid position ID format'),
  refresh_prices: z.boolean().default(false),
});

// ===== Order Schemas =====

export const ListOrdersInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID format'),
  status: z.enum(['accepted', 'filled', 'partially_filled', 'canceled', 'rejected']).optional(),
  symbol: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const CreateOrderInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID format'),
  symbol: z.string().min(1, 'Symbol is required'),
  qty: z.string().regex(/^\d+(\.\d+)?$/, 'Quantity must be a valid number'),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit']),
  time_in_force: z.enum(['day', 'gtc']),
  limit_price: z.string().regex(/^\d+(\.\d+)?$/, 'Limit price must be a valid number').optional(),
  client_order_id: z.string().optional(),
  commission: z.string().regex(/^\d+(\.\d+)?$/, 'Commission must be a valid number').optional(),
  commission_type: z.enum(['notional', 'qty', 'bps']).optional(),
}).refine(
  (data) => {
    // If order type is limit, limit_price is required
    if (data.type === 'limit' && !data.limit_price) {
      return false;
    }
    return true;
  },
  {
    message: 'limit_price is required when order type is limit',
    path: ['limit_price'],
  }
);

export const GetOrderInputSchema = z.object({
  order_id: z.string().uuid('Invalid order ID format'),
});

// ===== Asset Schemas =====

export const ListAssetsInputSchema = z.object({
  asset_class: z.enum(['us_equity', 'crypto']).optional(),
  tradable: z.boolean().optional(),
});

export const SearchAssetsInputSchema = z.object({
  q: z.string().optional(),
  status: z.enum(['active', 'inactive']).optional(),
  asset_class: z.enum(['us_equity', 'crypto']).optional(),
  tradable: z.boolean().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

// ===== Wallet Schemas =====

export const ListTransactionsInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID format'),
  type: z.enum(['deposit', 'withdrawal']).optional(),
  status: z.enum(['pending', 'processing', 'settled', 'failed', 'canceled']).optional(),
  funding_type: z.enum(['fiat', 'crypto']).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

const FiatFundingDetailsSchema = z.object({
  funding_type: z.literal('fiat'),
  fiat_currency: z.enum(['USD']),
  bank_account_id: z.string().min(1, 'Bank account ID is required'),
  method: z.enum(['ach', 'wire']),
});

const CryptoFundingDetailsSchema = z.object({
  funding_type: z.literal('crypto'),
  crypto_asset: z.enum(['BTC', 'ETH', 'USDC', 'USDT']),
  wallet_address: z.string().min(1, 'Wallet address is required'),
  network: z.enum(['Bitcoin', 'Ethereum', 'Polygon']),
});

export const FundAccountInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID format'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number'),
  funding_details: z.discriminatedUnion('funding_type', [
    FiatFundingDetailsSchema,
    CryptoFundingDetailsSchema,
  ]),
  description: z.string().optional(),
  external_reference_id: z.string().optional(),
});

export const WithdrawFundsInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID format'),
  amount: z.string().regex(/^\d+(\.\d+)?$/, 'Amount must be a valid number'),
  funding_details: z.discriminatedUnion('funding_type', [
    FiatFundingDetailsSchema,
    CryptoFundingDetailsSchema,
  ]),
  description: z.string().optional(),
  external_reference_id: z.string().optional(),
});

// ===== Account Schemas =====

export const ListAccountsInputSchema = z.object({});

export const GetAccountInputSchema = z.object({
  account_id: z.string().uuid('Invalid account ID format'),
});

// Type exports for use in handlers
export type ListPositionsInput = z.infer<typeof ListPositionsInputSchema>;
export type GetPositionInput = z.infer<typeof GetPositionInputSchema>;
export type ListOrdersInput = z.infer<typeof ListOrdersInputSchema>;
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;
export type GetOrderInput = z.infer<typeof GetOrderInputSchema>;
export type ListAssetsInput = z.infer<typeof ListAssetsInputSchema>;
export type SearchAssetsInput = z.infer<typeof SearchAssetsInputSchema>;
export type ListTransactionsInput = z.infer<typeof ListTransactionsInputSchema>;
export type FundAccountInput = z.infer<typeof FundAccountInputSchema>;
export type WithdrawFundsInput = z.infer<typeof WithdrawFundsInputSchema>;
export type ListAccountsInput = z.infer<typeof ListAccountsInputSchema>;
export type GetAccountInput = z.infer<typeof GetAccountInputSchema>;
