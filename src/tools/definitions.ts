/**
 * MCP Tool Definitions
 * These define what tools are available to Claude and their input schemas
 */

export const toolDefinitions = [
  // ===== Position Tools =====
  {
    name: 'list_positions',
    description: 'View current portfolio positions for an account, including quantity, cost basis, current value, and unrealized profit/loss. Optionally refresh live prices from market data providers.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          format: 'uuid',
          description: 'The account ID to retrieve positions for',
        },
        symbol: {
          type: 'string',
          description: 'Filter positions by ticker symbol (e.g., AAPL)',
        },
        non_zero_only: {
          type: 'boolean',
          default: false,
          description: 'Only return positions with non-zero quantity',
        },
        refresh_prices: {
          type: 'boolean',
          default: false,
          description: 'Fetch live prices from market data providers (adds latency but provides real-time data)',
        },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'get_position',
    description: 'Retrieve detailed information about a specific position, including P/L calculations and optionally live market prices with source and confidence metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          format: 'uuid',
          description: 'The account ID',
        },
        position_id: {
          type: 'string',
          format: 'uuid',
          description: 'The position ID to retrieve',
        },
        refresh_prices: {
          type: 'boolean',
          default: false,
          description: 'Fetch live price from market data providers',
        },
      },
      required: ['account_id', 'position_id'],
    },
  },

  // ===== Order Tools =====
  {
    name: 'list_orders',
    description: 'List trading orders for a specific account with optional filtering by status, symbol, or side. Supports pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          format: 'uuid',
          description: 'The account ID to retrieve orders for',
        },
        status: {
          type: 'string',
          enum: ['accepted', 'filled', 'partially_filled', 'canceled', 'rejected'],
          description: 'Filter orders by status',
        },
        symbol: {
          type: 'string',
          description: 'Filter orders by ticker symbol (e.g., AAPL)',
        },
        side: {
          type: 'string',
          enum: ['buy', 'sell'],
          description: 'Filter orders by side (buy or sell)',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 50,
          description: 'Maximum number of orders to return',
        },
        offset: {
          type: 'number',
          minimum: 0,
          default: 0,
          description: 'Number of orders to skip (for pagination)',
        },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'create_order',
    description: 'Place a new trading order (buy or sell) for a specific account. Supports market orders (immediate execution at current price) and limit orders (execution at specific price). IMPORTANT: For limit orders, limit_price is required.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          format: 'uuid',
          description: 'The account ID to place the order for',
        },
        symbol: {
          type: 'string',
          description: 'Ticker symbol of the asset to trade (e.g., AAPL, TSLA, BTC)',
        },
        qty: {
          type: 'string',
          description: 'Quantity of shares to trade (as a string, can be fractional like "10.5")',
        },
        side: {
          type: 'string',
          enum: ['buy', 'sell'],
          description: 'Whether to buy or sell the asset',
        },
        type: {
          type: 'string',
          enum: ['market', 'limit'],
          description: 'Order type: "market" executes immediately at current price, "limit" executes only at specified price or better',
        },
        time_in_force: {
          type: 'string',
          enum: ['day', 'gtc'],
          description: 'How long the order remains active: "day" expires at end of trading day, "gtc" (good till canceled) remains active until filled or canceled',
        },
        limit_price: {
          type: 'string',
          description: 'Price limit for limit orders (required when type is "limit"). Must be a valid number as a string.',
        },
        client_order_id: {
          type: 'string',
          description: 'Optional client-provided identifier for tracking',
        },
        commission: {
          type: 'string',
          description: 'Optional commission amount to charge',
        },
        commission_type: {
          type: 'string',
          enum: ['notional', 'qty', 'bps'],
          description: 'Commission calculation method: notional (per order), qty (per share), bps (basis points)',
        },
      },
      required: ['account_id', 'symbol', 'qty', 'side', 'type', 'time_in_force'],
    },
  },
  {
    name: 'get_order_status',
    description: 'Retrieve the current status and details of a specific order by its order ID.',
    inputSchema: {
      type: 'object',
      properties: {
        order_id: {
          type: 'string',
          format: 'uuid',
          description: 'The order ID to retrieve',
        },
      },
      required: ['order_id'],
    },
  },

  // ===== Asset Tools =====
  {
    name: 'list_assets',
    description: 'Retrieve a list of tradable assets (stocks, crypto) available on the platform. Can filter by asset class or tradability status.',
    inputSchema: {
      type: 'object',
      properties: {
        asset_class: {
          type: 'string',
          enum: ['us_equity', 'crypto'],
          description: 'Filter by asset class: us_equity for stocks or crypto for cryptocurrencies',
        },
        tradable: {
          type: 'boolean',
          description: 'Filter for assets that are currently tradable (true) or not tradable (false)',
        },
      },
    },
  },
  {
    name: 'search_assets',
    description: 'Search for assets by ticker symbol, name, or partial match. More flexible than list_assets for finding specific securities. Supports fuzzy matching.',
    inputSchema: {
      type: 'object',
      properties: {
        q: {
          type: 'string',
          description: 'Search query - ticker, company name, or partial match (e.g., "app" matches AAPL, "tesla" matches TSLA)',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive'],
          description: 'Filter by asset status',
        },
        asset_class: {
          type: 'string',
          enum: ['us_equity', 'crypto'],
          description: 'Filter by asset class',
        },
        tradable: {
          type: 'boolean',
          description: 'Filter for assets that are currently tradable',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 50,
          description: 'Maximum number of results to return',
        },
        offset: {
          type: 'number',
          minimum: 0,
          default: 0,
          description: 'Number of results to skip (for pagination)',
        },
      },
    },
  },

  // ===== Wallet Tools =====
  {
    name: 'list_transactions',
    description: 'View transaction history for an account, including deposits and withdrawals. Supports filtering by type, status, funding type, and date range.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          format: 'uuid',
          description: 'The account ID to retrieve transactions for',
        },
        type: {
          type: 'string',
          enum: ['deposit', 'withdrawal'],
          description: 'Filter transactions by type',
        },
        status: {
          type: 'string',
          enum: ['pending', 'processing', 'settled', 'failed', 'canceled'],
          description: 'Filter transactions by status',
        },
        funding_type: {
          type: 'string',
          enum: ['fiat', 'crypto'],
          description: 'Filter by funding type: fiat (bank transfer) or crypto (cryptocurrency)',
        },
        date_from: {
          type: 'string',
          description: 'Filter transactions from this date (YYYY-MM-DD format)',
        },
        date_to: {
          type: 'string',
          description: 'Filter transactions to this date (YYYY-MM-DD format)',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 100,
          default: 50,
          description: 'Maximum number of transactions to return',
        },
        offset: {
          type: 'number',
          minimum: 0,
          default: 0,
          description: 'Number of transactions to skip (for pagination)',
        },
      },
      required: ['account_id'],
    },
  },
  {
    name: 'fund_account',
    description: 'Deposit funds into an investment account via fiat (ACH/wire) or crypto transfer. The transaction will be processed asynchronously.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          format: 'uuid',
          description: 'The account ID to fund',
        },
        amount: {
          type: 'string',
          description: 'Amount to deposit (as a string, e.g., "5000.00")',
        },
        funding_details: {
          type: 'object',
          description: 'Funding method details (fiat or crypto)',
          oneOf: [
            {
              type: 'object',
              properties: {
                funding_type: { type: 'string', const: 'fiat' },
                fiat_currency: { type: 'string', enum: ['USD'] },
                bank_account_id: { type: 'string' },
                method: { type: 'string', enum: ['ach', 'wire'] },
              },
              required: ['funding_type', 'fiat_currency', 'bank_account_id', 'method'],
            },
            {
              type: 'object',
              properties: {
                funding_type: { type: 'string', const: 'crypto' },
                crypto_asset: { type: 'string', enum: ['BTC', 'ETH', 'USDC', 'USDT'] },
                wallet_address: { type: 'string' },
                network: { type: 'string', enum: ['Bitcoin', 'Ethereum', 'Polygon'] },
              },
              required: ['funding_type', 'crypto_asset', 'wallet_address', 'network'],
            },
          ],
        },
        description: {
          type: 'string',
          description: 'Optional description for the funding transaction',
        },
        external_reference_id: {
          type: 'string',
          description: 'Optional external reference ID for tracking',
        },
      },
      required: ['account_id', 'amount', 'funding_details'],
    },
  },
  {
    name: 'withdraw_funds',
    description: 'Withdraw funds from an investment account via fiat (ACH/wire) or crypto transfer. The transaction will be processed asynchronously.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          format: 'uuid',
          description: 'The account ID to withdraw from',
        },
        amount: {
          type: 'string',
          description: 'Amount to withdraw (as a string, e.g., "1000.00")',
        },
        funding_details: {
          type: 'object',
          description: 'Withdrawal method details (fiat or crypto)',
          oneOf: [
            {
              type: 'object',
              properties: {
                funding_type: { type: 'string', const: 'fiat' },
                fiat_currency: { type: 'string', enum: ['USD'] },
                bank_account_id: { type: 'string' },
                method: { type: 'string', enum: ['ach', 'wire'] },
              },
              required: ['funding_type', 'fiat_currency', 'bank_account_id', 'method'],
            },
            {
              type: 'object',
              properties: {
                funding_type: { type: 'string', const: 'crypto' },
                crypto_asset: { type: 'string', enum: ['BTC', 'ETH', 'USDC', 'USDT'] },
                wallet_address: { type: 'string' },
                network: { type: 'string', enum: ['Bitcoin', 'Ethereum', 'Polygon'] },
              },
              required: ['funding_type', 'crypto_asset', 'wallet_address', 'network'],
            },
          ],
        },
        description: {
          type: 'string',
          description: 'Optional description for the withdrawal transaction',
        },
        external_reference_id: {
          type: 'string',
          description: 'Optional external reference ID for tracking',
        },
      },
      required: ['account_id', 'amount', 'funding_details'],
    },
  },

  // ===== Account Tools =====
  {
    name: 'list_accounts',
    description: 'List all investment accounts accessible with the current API credentials.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_account',
    description: 'Retrieve detailed information about a specific account, including status, balance, enabled assets, and contact information.',
    inputSchema: {
      type: 'object',
      properties: {
        account_id: {
          type: 'string',
          format: 'uuid',
          description: 'The account ID to retrieve',
        },
      },
      required: ['account_id'],
    },
  },
];
