import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Configuration schema for Bluum MCP Server
 */
const ConfigSchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().min(1, 'API secret is required'),
  environment: z.enum(['sandbox', 'production']).default('sandbox'),
  baseUrl: z.string().url().optional(),
  defaultAccountId: z.string().uuid().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * Load configuration from file or environment variables
 * Priority: config file > environment variables
 */
export function loadConfig(): Config {
  // Try to load from config file first
  const configPath = process.env.BLUUM_CONFIG_PATH || resolve(process.cwd(), 'config/bluum.config.json');

  let fileConfig: Partial<Config> = {};
  try {
    const configFile = readFileSync(configPath, 'utf-8');
    fileConfig = JSON.parse(configFile);
  } catch (error) {
    // Config file not found or invalid, will fall back to env vars
    console.error(`Warning: Could not load config from ${configPath}, falling back to environment variables`);
  }

  // Merge with environment variables (env vars have lower priority)
  const config = {
    apiKey: fileConfig.apiKey || process.env.BLUUM_API_KEY || '',
    apiSecret: fileConfig.apiSecret || process.env.BLUUM_API_SECRET || '',
    environment: (fileConfig.environment || process.env.BLUUM_ENV || 'sandbox') as 'sandbox' | 'production',
    baseUrl: fileConfig.baseUrl || process.env.BLUUM_BASE_URL,
    defaultAccountId: fileConfig.defaultAccountId || process.env.BLUUM_DEFAULT_ACCOUNT_ID,
  };

  // Validate configuration
  try {
    return ConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
      throw new Error(`Invalid configuration: ${issues}`);
    }
    throw error;
  }
}

/**
 * Get the base URL for the configured environment
 */
export function getBaseUrl(config: Config): string {
  if (config.baseUrl) {
    return config.baseUrl;
  }

  return config.environment === 'production'
    ? 'https://api.bluum.finance/v1'
    : 'https://sandbox.api.bluum.finance/v1';
}
