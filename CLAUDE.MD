# Bluum Finance MCP Server - Implementation Plan

## Executive Summary

This document outlines the complete plan for building an MCP (Model Context Protocol) server for the Bluum Finance Investment API. The server will enable Claude to interact with Bluum's brokerage infrastructure through natural language, allowing users to trade, manage wallets, discover assets, and view positions directly from Claude conversations.

**Target Use Case**: Public demo showcasing embedded investment experiences through conversational AI.

---

## What is an MCP Server?

### Overview
The Model Context Protocol (MCP) is an open protocol that enables AI assistants like Claude to securely connect to external data sources and tools. Think of it as a "plugin system" for Claude.

### How It Works
```
User → Claude Desktop → MCP Server → Bluum API
                ↓
            Natural Language Request
                ↓
            Tool Execution
                ↓
            Structured Response
```

1. **User**: "What's the current price of AAPL?"
2. **Claude**: Recognizes this needs the `list_assets` tool
3. **MCP Server**: Calls `GET /assets?symbol=AAPL`
4. **Bluum API**: Returns asset data
5. **Claude**: Formats response naturally

### Why MCP?
- **Type-safe**: Tools have schemas that Claude understands
- **Secure**: Credentials never exposed to Claude
- **Composable**: Can combine multiple tools in one conversation
- **Standard**: Works across all MCP-compatible AI assistants

---

## Technical Architecture

### Stack
- **Language**: TypeScript (Node.js 18+)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP Client**: `axios` or `node-fetch`
- **Schema Validation**: `zod` (for runtime type safety)
- **Build Tool**: `tsup` or `tsc`
- **Package Manager**: `npm` or `pnpm`

### Component Architecture
```
┌─────────────────────────────────────────┐
│         Claude Desktop Client           │
└─────────────────┬───────────────────────┘
                  │ stdio
                  │
┌─────────────────▼───────────────────────┐
│          MCP Server (TypeScript)        │
│  ┌─────────────────────────────────┐   │
│  │   Tool Registry                 │   │
│  │   - list_orders                 │   │
│  │   - create_order                │   │
│  │   - get_order_status            │   │
│  │   - list_assets                 │   │
│  │   - get_transactions            │   │
│  │   - fund_account                │   │
│  │   - withdraw_funds              │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   Authentication Layer          │   │
│  │   - HTTP Basic Auth             │   │
│  │   - Config File Loader          │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │   API Client                    │   │
│  │   - Request Builder             │   │
│  │   - Response Parser             │   │
│  │   - Error Handler               │   │
│  └─────────────────────────────────┘   │
└─────────────────┬───────────────────────┘
                  │ HTTPS
                  │
┌─────────────────▼───────────────────────┐
│        Bluum Finance API                │
│  - Production: api.bluum.finance        │
│  - Sandbox: sandbox.api.bluum.finance   │
└─────────────────────────────────────────┘
```

---

## API Analysis & MCP Tool Mapping

### Prioritization

#### **Priority 1: Trading & Market Data**
| MCP Tool Name | HTTP Method | Endpoint | Description |
|--------------|-------------|----------|-------------|
| `list_orders` | GET | `/trading/accounts/{account_id}/orders` | List all orders with filtering |
| `create_order` | POST | `/trading/accounts/{account_id}/orders` | Place buy/sell order |
| `get_order_status` | GET | `/trading/orders/{order_id}` | Get specific order details |
| `list_assets` | GET | `/assets` | Browse tradable assets |
| `search_asset` | GET | `/assets?symbol={symbol}` | Find specific asset by symbol |

**Note**: The OpenAPI spec doesn't include a `/positions` endpoint. You'll need to either:
- Check if this endpoint exists but is undocumented
- Calculate positions from filled orders
- Request this feature from Bluum

#### **Priority 2: Wallet Operations**
| MCP Tool Name | HTTP Method | Endpoint | Description |
|--------------|-------------|----------|-------------|
| `list_transactions` | GET | `/wallet/accounts/{account_id}/transactions` | View transaction history |
| `fund_account` | POST | `/wallet/accounts/{account_id}/funding` | Deposit funds |
| `withdraw_funds` | POST | `/wallet/withdrawals` | Withdraw funds |

#### **Priority 3: Account Management** (Deprioritized but included for completeness)
| MCP Tool Name | HTTP Method | Endpoint | Description |
|--------------|-------------|----------|-------------|
| `list_accounts` | GET | `/accounts` | List all accounts |
| `get_account` | GET | `/accounts/{account_id}` | Get account details |
| `create_account` | POST | `/accounts` | Create new account |

#### **Not Implemented in v1** (Can add later if needed)
- Document management (upload ID, proof of address)

---

## Implementation Plan

### Phase 1: Project Setup
```bash
# Initialize project
npm init -y
npm install typescript @types/node tsup --save-dev
npm install @modelcontextprotocol/sdk axios zod dotenv

# TypeScript configuration
npx tsc --init
```

### Phase 2: Core Infrastructure

#### 2.1 Configuration Management (`src/config.ts`)
```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  apiKey: z.string().min(1),
  apiSecret: z.string().min(1),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  baseUrl: z.string().url().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  // Load from config file or environment variables
  const config = {
    apiKey: process.env.BLUUM_API_KEY || '',
    apiSecret: process.env.BLUUM_API_SECRET || '',
    environment: process.env.BLUUM_ENV || 'sandbox',
  };

  return ConfigSchema.parse(config);
}
```

#### 2.2 API Client (`src/api-client.ts`)
```typescript
import axios, { AxiosInstance } from 'axios';
import { Config } from './config';

export class BluumApiClient {
  private client: AxiosInstance;

  constructor(config: Config) {
    const baseURL = config.baseUrl || (
      config.environment === 'production'
        ? 'https://api.bluum.finance/v1'
        : 'https://sandbox.api.bluum.finance/v1'
    );

    const auth = Buffer.from(
      `${config.apiKey}:${config.apiSecret}`
    ).toString('base64');

    this.client = axios.create({
      baseURL,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });
  }

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

  // ... more methods
}
```

#### 2.3 Type Definitions (`src/types.ts`)
Generate these from the OpenAPI spec using `openapi-typescript`:
```bash
npm install openapi-typescript --save-dev
npx openapi-typescript openapi.yaml -o src/types.ts
```

### Phase 3: MCP Tool Implementation

#### 3.1 Tool Schemas (`src/tools/schemas.ts`)
Define input schemas for each tool:
```typescript
import { z } from 'zod';

export const ListOrdersInputSchema = z.object({
  account_id: z.string().uuid(),
  status: z.enum(['accepted', 'filled', 'partially_filled', 'canceled', 'rejected']).optional(),
  symbol: z.string().optional(),
  side: z.enum(['buy', 'sell']).optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export const CreateOrderInputSchema = z.object({
  account_id: z.string().uuid(),
  symbol: z.string().min(1),
  qty: z.string().regex(/^\d+$/),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit']),
  time_in_force: z.enum(['day', 'gtc']),
  limit_price: z.string().optional(),
  client_order_id: z.string().optional(),
  commission: z.string().optional(),
  commission_type: z.enum(['notional', 'qty', 'bps']).optional(),
});

export const ListAssetsInputSchema = z.object({
  asset_class: z.enum(['us_equity', 'crypto']).optional(),
  tradable: z.boolean().optional(),
  symbol: z.string().optional(), // For searching specific assets
});
```

#### 3.2 Tool Handlers (`src/tools/handlers.ts`)
```typescript
import { BluumApiClient } from '../api-client';
import { ListOrdersInputSchema, CreateOrderInputSchema } from './schemas';

export function createToolHandlers(apiClient: BluumApiClient) {
  return {
    list_orders: async (input: unknown) => {
      const params = ListOrdersInputSchema.parse(input);
      const orders = await apiClient.listOrders(params.account_id, params);
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(orders, null, 2),
        }],
      };
    },

    create_order: async (input: unknown) => {
      const params = CreateOrderInputSchema.parse(input);
      const { account_id, ...orderData } = params;
      const order = await apiClient.createOrder(account_id, orderData);
      return {
        content: [{
          type: 'text',
          text: `Order created successfully:\n${JSON.stringify(order, null, 2)}`,
        }],
      };
    },

    // ... more handlers
  };
}
```

#### 3.3 Tool Definitions (`src/tools/definitions.ts`)
```typescript
export const toolDefinitions = [
  {
    name: 'list_orders',
    description: 'List trading orders for a specific account with optional filtering by status, symbol, or side.',
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
    description: 'Place a new trading order (buy or sell) for a specific account. Supports market and limit orders.',
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
          description: 'Ticker symbol of the asset to trade (e.g., AAPL, TSLA)',
        },
        qty: {
          type: 'string',
          description: 'Quantity of shares to trade (as a string)',
        },
        side: {
          type: 'string',
          enum: ['buy', 'sell'],
          description: 'Whether to buy or sell the asset',
        },
        type: {
          type: 'string',
          enum: ['market', 'limit'],
          description: 'Order type: market (immediate execution) or limit (specific price)',
        },
        time_in_force: {
          type: 'string',
          enum: ['day', 'gtc'],
          description: 'How long the order remains active: day (until end of trading day) or gtc (good till canceled)',
        },
        limit_price: {
          type: 'string',
          description: 'Price limit for limit orders (required when type is limit)',
        },
        client_order_id: {
          type: 'string',
          description: 'Optional client-provided identifier for tracking',
        },
      },
      required: ['account_id', 'symbol', 'qty', 'side', 'type', 'time_in_force'],
    },
  },
  {
    name: 'list_assets',
    description: 'Retrieve a list of tradable assets (stocks, crypto) available on the platform. Can filter by asset class or tradability.',
    inputSchema: {
      type: 'object',
      properties: {
        asset_class: {
          type: 'string',
          enum: ['us_equity', 'crypto'],
          description: 'Filter by asset class',
        },
        tradable: {
          type: 'boolean',
          description: 'Filter for assets that are currently tradable',
        },
        symbol: {
          type: 'string',
          description: 'Search for a specific asset by symbol (e.g., AAPL)',
        },
      },
    },
  },
  // ... more tool definitions
];
```

### Phase 4: Main Server (`src/index.ts`)
```typescript
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { BluumApiClient } from './api-client.js';
import { createToolHandlers } from './tools/handlers.js';
import { toolDefinitions } from './tools/definitions.js';

const config = loadConfig();
const apiClient = new BluumApiClient(config);
const toolHandlers = createToolHandlers(apiClient);

const server = new Server(
  {
    name: 'bluum-finance-mcp-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Register tool list handler
server.setRequestHandler('tools/list', async () => ({
  tools: toolDefinitions,
}));

// Register tool call handler
server.setRequestHandler('tools/call', async (request) => {
  const { name, arguments: args } = request.params;

  const handler = toolHandlers[name];
  if (!handler) {
    throw new Error(`Unknown tool: ${name}`);
  }

  try {
    return await handler(args);
  } catch (error) {
    if (error instanceof Error) {
      return {
        content: [{
          type: 'text',
          text: `Error: ${error.message}`,
        }],
        isError: true,
      };
    }
    throw error;
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Bluum Finance MCP Server running on stdio');
}

main().catch(console.error);
```

---

## Project Structure

```
bluum-mcp-server/
├── src/
│   ├── index.ts              # Main server entry point
│   ├── config.ts             # Configuration loader
│   ├── api-client.ts         # Bluum API HTTP client
│   ├── types.ts              # Generated TypeScript types from OpenAPI
│   ├── tools/
│   │   ├── definitions.ts    # MCP tool definitions
│   │   ├── schemas.ts        # Zod schemas for validation
│   │   └── handlers.ts       # Tool implementation logic
│   └── utils/
│       ├── errors.ts         # Error handling utilities
│       └── logger.ts         # Logging utilities
├── config/
│   └── bluum.config.json     # User configuration file
├── tests/
│   ├── api-client.test.ts
│   ├── tools.test.ts
│   └── integration.test.ts
├── openapi.yaml              # Bluum API specification
├── package.json
├── tsconfig.json
├── .env.example              # Example environment variables
├── .gitignore
├── README.md
└── CLAUDE.MD                 # This file
```

### Configuration File Format

**config/bluum.config.json**:
```json
{
  "apiKey": "your_api_key_here",
  "apiSecret": "your_api_secret_here",
  "environment": "sandbox",
  "defaultAccountId": "3d0b0e65-35d3-4dcd-8df7-10286ebb4b4b"
}
```

---

## Security Considerations

### 1. Credential Management
- **NEVER commit** `bluum.config.json` to git (add to `.gitignore`)
- Store production credentials separately from sandbox
- Consider using environment variables for CI/CD

### 2. Input Validation
- All tool inputs validated with Zod schemas
- UUIDs verified against regex patterns
- Numeric values constrained (e.g., order quantity > 0)

### 3. Error Handling
- Don't expose sensitive API errors to Claude
- Log full errors server-side for debugging
- Return user-friendly error messages

### 4. Rate Limiting
- Implement client-side rate limiting to avoid API bans
- Cache asset lists (they don't change frequently)
- Consider exponential backoff for retries

### 5. Sensitive Operations
Since this is a financial API:
- Consider adding confirmation prompts for:
  - Orders above certain dollar amounts
  - Withdrawals
  - Account deletions
- Log all trading operations for audit trail

---

## Development Roadmap

### Milestone 1: MVP (Week 1-2)
- [x] Project setup and dependencies
- [ ] API client with authentication
- [ ] Core trading tools (list/create orders, list assets)
- [ ] Basic error handling
- [ ] Manual testing with Claude Desktop

### Milestone 2: Full Trading Suite (Week 3)
- [ ] Wallet operations (transactions, funding, withdrawals)
- [ ] Account management tools
- [ ] Enhanced error messages
- [ ] Unit tests for all tools
- [ ] Integration tests with sandbox API

### Milestone 3: Polish & Demo (Week 4)
- [ ] Optimize response formatting for Claude
- [ ] Add caching layer for assets
- [ ] Rate limiting implementation
- [ ] Demo scenarios and sample conversations
- [ ] Documentation for public use

### Future Enhancements
- [ ] Positions endpoint (pending API availability)
- [ ] Document management tools
- [ ] WebSocket support for real-time order updates
- [ ] Portfolio analysis tools
- [ ] Multi-account support
- [ ] Transaction export (CSV/PDF)

---

## Testing Strategy

### Unit Tests
```typescript
// Example: tests/api-client.test.ts
import { describe, it, expect, vi } from 'vitest';
import { BluumApiClient } from '../src/api-client';

describe('BluumApiClient', () => {
  it('should authenticate with Basic Auth', () => {
    const client = new BluumApiClient({
      apiKey: 'test_key',
      apiSecret: 'test_secret',
      environment: 'sandbox',
    });

    // Verify Authorization header is set correctly
  });

  it('should handle 401 errors gracefully', async () => {
    // Mock unauthorized response
    // Verify error handling
  });
});
```

### Integration Tests
```typescript
// Example: tests/integration.test.ts
describe('Trading Flow', () => {
  it('should create and retrieve an order', async () => {
    // 1. Create order
    const order = await createOrder({
      account_id: TEST_ACCOUNT_ID,
      symbol: 'AAPL',
      qty: '1',
      side: 'buy',
      type: 'market',
      time_in_force: 'day',
    });

    // 2. Retrieve order
    const retrieved = await getOrder(order.id);

    // 3. Verify data matches
    expect(retrieved.id).toBe(order.id);
  });
});
```

### Manual Testing with Claude
Create test scenarios:
```
User: "Show me all my open orders"
Expected: Lists orders with status 'accepted'

User: "Buy 10 shares of TSLA at market price"
Expected: Creates market order and confirms

User: "What's the current price of Bitcoin?"
Expected: Lists BTC asset with current price
```

---

## Deployment Guide

### Local Development Setup

1. **Clone and Install**:
```bash
git clone https://github.com/kope-kope/bluum-mcp-server.git
cd bluum-mcp-server
npm install
```

2. **Configure Credentials**:
```bash
cp config/bluum.config.example.json config/bluum.config.json
# Edit config/bluum.config.json with your API credentials
```

3. **Build**:
```bash
npm run build
```

4. **Configure Claude Desktop**:
Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or equivalent:
```json
{
  "mcpServers": {
    "bluum-finance": {
      "command": "node",
      "args": ["/absolute/path/to/bluum-mcp-server/dist/index.js"],
      "env": {
        "BLUUM_CONFIG_PATH": "/absolute/path/to/bluum-mcp-server/config/bluum.config.json"
      }
    }
  }
}
```

5. **Restart Claude Desktop** and verify the server appears in the MCP menu.

### Production Deployment (for public demo)

1. **Security Hardening**:
   - Use read-only API keys if possible
   - Implement rate limiting
   - Add request logging
   - Set up monitoring/alerting

2. **Distribution Options**:
   - **npm package**: Publish to npm for easy installation
   - **Docker image**: Containerize for consistent deployment
   - **Binary**: Package with `pkg` for standalone executable

3. **Documentation**:
   - Installation guide
   - Configuration reference
   - Example conversations
   - Troubleshooting guide

---

## Example Conversations

### Trading Scenario
```
User: What can I trade on Bluum?
Claude: [Uses list_assets tool]
Returns: "Bluum supports trading US equities and cryptocurrencies..."

User: Buy 5 shares of Apple at market price for account acc_123...
Claude: [Uses create_order tool]
Returns: "Order placed successfully! Order ID: ord_xyz... Status: Accepted..."

User: What's the status of my last order?
Claude: [Uses list_orders tool with limit=1]
Returns: "Your most recent order (ord_xyz) is filled at $175.50..."
```

### Wallet Scenario
```
User: Show me my transaction history for the last month
Claude: [Uses list_transactions tool with date filters]
Returns: "Here are your transactions..."

User: Deposit $1000 via ACH
Claude: [Uses fund_account tool]
Returns: "Deposit initiated. Transaction ID: txn_abc... Status: Pending..."
```

---

## Known Limitations & Gaps

1. **Positions Endpoint Missing**: The OpenAPI spec doesn't include a positions/portfolio endpoint. This is a critical feature for a trading platform. Recommend:
   - Contacting Bluum to confirm if this endpoint exists
   - If not, calculating positions from order history (less accurate)

2. **Market Data**: No real-time quote data in the API spec. Users can see assets but not live prices. Consider:
   - Integrating a third-party market data API
   - Directing users to check prices externally

3. **Order Modification**: No PATCH/PUT endpoint for modifying orders. Users must cancel and recreate.

4. **Historical Data**: Limited to transaction history. No performance metrics or portfolio analytics.

---

## Success Metrics

### Technical Metrics
- [ ] All priority 1 tools implemented and tested
- [ ] <100ms average tool execution time (excluding API latency)
- [ ] 99%+ uptime during demo period
- [ ] Zero credential leaks or security incidents

### User Experience Metrics
- [ ] Users can place orders through natural language
- [ ] Error messages are clear and actionable
- [ ] Demo flows complete without manual intervention

---

## Support & Resources

### MCP Resources
- [MCP Documentation](https://modelcontextprotocol.io)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [Example MCP Servers](https://github.com/modelcontextprotocol/servers)

### Bluum Resources
- [Bluum API Documentation](https://docs.bluumfinance.com)
- OpenAPI Spec: `openapi.yaml` in this repo

### Development Tools
- [OpenAPI TypeScript Generator](https://github.com/drwpow/openapi-typescript)
- [Zod](https://zod.dev) - Runtime type validation
- [Vitest](https://vitest.dev) - Testing framework

---

## Next Steps

1. **Review this plan** and confirm the approach aligns with your vision
2. **Verify API access** - Ensure you have sandbox credentials
3. **Test the positions gap** - Confirm whether Bluum has an undocumented positions endpoint
4. **Start development** - Begin with Milestone 1 (MVP)
5. **Iterate based on testing** - Refine tools based on real Claude conversations

---

**Questions or feedback?** Let's discuss before implementation begins!
