# Bluum Finance MCP Server

A Model Context Protocol (MCP) server that enables Claude to interact with the [Bluum Finance Investment API](https://docs.bluumfinance.com). Trade stocks and crypto, manage portfolios, view positions, and handle wallet operations through natural language conversations.

## Features

### 🎯 Priority Features
- **Portfolio Management**: View positions with real-time P/L, cost basis, and market values
- **Trading**: Place market and limit orders, check order status, manage trades
- **Asset Discovery**: Search and browse tradable stocks and cryptocurrencies
- **Wallet Operations**: Deposit and withdraw funds via fiat (ACH/wire) or crypto

### 📊 Available Tools

**Positions** (2 tools)
- `list_positions` - View all portfolio positions with P/L
- `get_position` - Get detailed position with optional live prices

**Trading** (3 tools)
- `list_orders` - List orders with filtering
- `create_order` - Place buy/sell orders (market/limit)
- `get_order_status` - Check order status

**Assets** (2 tools)
- `list_assets` - Browse tradable assets
- `search_assets` - Search by ticker or name

**Wallet** (3 tools)
- `list_transactions` - View transaction history
- `fund_account` - Deposit funds (fiat/crypto)
- `withdraw_funds` - Withdraw funds

**Accounts** (2 tools)
- `list_accounts` - List all accounts
- `get_account` - Get account details

## Installation

### Prerequisites
- Node.js 18+ and npm
- Bluum Finance API credentials ([Sign up here](https://bluumfinance.com))
- Claude Desktop app

### 1. Clone and Install

```bash
git clone https://github.com/kope-kope/bluum-mcp-server.git
cd bluum-mcp-server
npm install
```

### 2. Configure Credentials

Create your configuration file:

```bash
cp config/bluum.config.example.json config/bluum.config.json
```

Edit `config/bluum.config.json`:

```json
{
  "apiKey": "your_bluum_api_key_here",
  "apiSecret": "your_bluum_api_secret_here",
  "environment": "sandbox",
  "defaultAccountId": "your_account_id_uuid"
}
```

**Important**: Never commit `config/bluum.config.json` - it contains sensitive credentials!

### 3. Build

```bash
npm run build
```

### 4. Configure Claude Desktop

Edit Claude Desktop config file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the server configuration:

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

**Replace `/absolute/path/to/bluum-mcp-server/` with your actual path!**

### 5. Restart Claude Desktop

Restart Claude Desktop and verify the MCP server appears in the integrations menu (🔌 icon).

## Usage Examples

### View Portfolio
```
User: Show me my current portfolio positions
Claude: [Calls list_positions]
Returns your positions with quantity, cost basis, current value, and unrealized P/L
```

### Place a Trade
```
User: Buy 10 shares of Apple at market price
Claude: [Calls create_order with symbol=AAPL, qty=10, side=buy, type=market]
Returns order confirmation with order ID and status
```

### Search for Assets
```
User: Find Tesla stock
Claude: [Calls search_assets with q="Tesla"]
Returns TSLA asset details including exchange, tradability, etc.
```

### Check Transaction History
```
User: Show my transactions from last month
Claude: [Calls list_transactions with date filters]
Returns deposit/withdrawal history with amounts and status
```

## Configuration Options

### Config File (`config/bluum.config.json`)

| Field | Required | Description |
|-------|----------|-------------|
| `apiKey` | ✅ | Your Bluum API key |
| `apiSecret` | ✅ | Your Bluum API secret |
| `environment` | ❌ | `sandbox` or `production` (default: `sandbox`) |
| `baseUrl` | ❌ | Custom API base URL (overrides environment) |
| `defaultAccountId` | ❌ | Default account UUID for operations |

### Environment Variables

Alternatively, use environment variables (lower priority than config file):

- `BLUUM_API_KEY` - API key
- `BLUUM_API_SECRET` - API secret
- `BLUUM_ENV` - Environment (`sandbox` or `production`)
- `BLUUM_BASE_URL` - Custom base URL
- `BLUUM_DEFAULT_ACCOUNT_ID` - Default account ID
- `BLUUM_CONFIG_PATH` - Path to config file

## Development

### Project Structure

```
bluum-mcp-server/
├── src/
│   ├── index.ts              # Main MCP server
│   ├── config.ts             # Configuration loader
│   ├── api-client.ts         # Bluum API HTTP client
│   └── tools/
│       ├── definitions.ts    # MCP tool definitions
│       ├── schemas.ts        # Zod validation schemas
│       └── handlers.ts       # Tool implementation logic
├── config/
│   └── bluum.config.json     # Your credentials (gitignored)
├── openapi.yaml              # Bluum API specification
├── CLAUDE.MD                 # Implementation plan
└── package.json
```

### Scripts

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode (recompile on changes)
npm run typecheck  # Type check without building
npm start          # Run the server (after building)
```

### Adding New Tools

1. Add tool schema to `src/tools/schemas.ts`
2. Add API client method to `src/api-client.ts`
3. Add tool handler to `src/tools/handlers.ts`
4. Add tool definition to `src/tools/definitions.ts`
5. Rebuild: `npm run build`

## Security Best Practices

- ✅ **Never commit** `config/bluum.config.json` or `.env` files
- ✅ **Use sandbox environment** for testing
- ✅ **Review orders** before execution in production
- ✅ **Set up read-only API keys** if only viewing data
- ✅ **Monitor API usage** and set up alerts
- ⚠️ **Be cautious** with withdrawal operations

## Troubleshooting

### Server Not Appearing in Claude Desktop

1. Check config file path is absolute (not relative)
2. Verify config file exists and has valid JSON
3. Check Claude Desktop logs: `~/Library/Logs/Claude/mcp*.log` (macOS)
4. Restart Claude Desktop completely

### Authentication Errors

- Verify API key and secret are correct
- Check you're using the right environment (sandbox vs production)
- Ensure API credentials have proper permissions

### Build Errors

```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

## API Documentation

- [Bluum Finance API Docs](https://docs.bluumfinance.com)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- OpenAPI spec: `openapi.yaml` in this repo

## Known Limitations

1. **Market Data Latency**: Real-time prices via `refresh_prices` add latency
2. **Order Modification**: Can't modify orders, must cancel and recreate
3. **Portfolio Analytics**: No aggregate portfolio metrics (calculate client-side)
4. **Rate Limits**: Subject to Bluum API rate limits

## Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

- **Issues**: [GitHub Issues](https://github.com/kope-kope/bluum-mcp-server/issues)
- **Bluum Support**: [https://bluumfinance.com/contact](https://bluumfinance.com/contact)
- **MCP Discord**: [Join MCP Community](https://discord.gg/mcp)

---

Built with ❤️ for the Claude Desktop community
