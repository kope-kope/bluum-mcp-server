#!/usr/bin/env node

/**
 * Bluum Finance MCP Server
 *
 * This server enables Claude to interact with the Bluum Finance Investment API
 * for trading, portfolio management, and wallet operations.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from './config.js';
import { BluumApiClient } from './api-client.js';
import { createToolHandlers } from './tools/handlers.js';
import { toolDefinitions } from './tools/definitions.js';
import { z } from 'zod';

/**
 * Main server initialization
 */
async function main() {
  console.error('Starting Bluum Finance MCP Server...');

  // Load configuration
  let config;
  try {
    config = loadConfig();
    console.error(`Configuration loaded successfully (environment: ${config.environment})`);
  } catch (error) {
    console.error('Failed to load configuration:', error);
    process.exit(1);
  }

  // Initialize API client
  const apiClient = new BluumApiClient(config);
  console.error('Bluum API client initialized');

  // Create tool handlers
  const toolHandlers = createToolHandlers(apiClient);
  console.error(`${Object.keys(toolHandlers).length} tools registered`);

  // Create MCP server instance
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

  // Register handler for listing available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: toolDefinitions,
    };
  });

  // Register handler for tool execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    console.error(`Executing tool: ${name}`);

    // Get the handler for this tool
    const handler = toolHandlers[name as keyof typeof toolHandlers];
    if (!handler) {
      throw new Error(`Unknown tool: ${name}`);
    }

    try {
      // Execute the tool handler
      const result = await handler(args ?? {});
      console.error(`Tool ${name} executed successfully`);
      return result;
    } catch (error) {
      // Handle errors gracefully
      if (error instanceof z.ZodError) {
        // Validation error
        const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        console.error(`Validation error in ${name}:`, issues);
        return {
          content: [{
            type: 'text' as const,
            text: `Invalid input: ${issues}`,
          }],
          isError: true,
        };
      } else if (error instanceof Error) {
        // API or other errors
        console.error(`Error in ${name}:`, error.message);
        return {
          content: [{
            type: 'text' as const,
            text: `Error: ${error.message}`,
          }],
          isError: true,
        };
      } else {
        // Unknown error
        console.error(`Unknown error in ${name}:`, error);
        throw error;
      }
    }
  });

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error('Bluum Finance MCP Server running on stdio');
  console.error('Waiting for requests from Claude Desktop...');
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
