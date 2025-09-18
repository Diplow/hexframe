/**
 * MCP Server Configuration Utilities
 *
 * Generates MCP client configurations for different environments
 */

export interface McpServerEnvironment {
  isProduction: boolean;
  isLocal: boolean;
  serverUrl: string | null;
  httpEndpoint: string | null;
  stdioAvailable: boolean;
}

/**
 * Detect the current MCP server environment
 */
export function detectMcpEnvironment(): McpServerEnvironment {
  // Check if we're in production based on various environment indicators
  const betterAuthUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  const vercelUrl = process.env.VERCEL_URL ?? process.env.NEXT_PUBLIC_VERCEL_URL;
  const nodeEnv = process.env.NODE_ENV;

  // Production indicators
  const isProduction = !!(
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    (betterAuthUrl && !betterAuthUrl.includes('localhost')) ||
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    (vercelUrl && !vercelUrl.includes('localhost')) ||
    nodeEnv === 'production'
  );

  const isLocal = !isProduction;

  // Determine server URL
  let serverUrl: string | null = null;
  if (betterAuthUrl) {
    serverUrl = betterAuthUrl;
  } else if (vercelUrl) {
    serverUrl = vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
  } else if (isLocal) {
    serverUrl = 'http://localhost:3000';
  }

  // HTTP endpoint for MCP
  const httpEndpoint = serverUrl ? `${serverUrl}/api/mcp` : null;

  // Stdio is available in local development
  const stdioAvailable = isLocal;

  return {
    isProduction,
    isLocal,
    serverUrl,
    httpEndpoint,
    stdioAvailable,
  };
}

/**
 * Generate Claude Desktop MCP configuration
 */
export function generateMcpConfiguration(apiKey: string, serverName = 'hexframe'): {
  production: object;
  local: object;
  current: object;
  environment: McpServerEnvironment;
} {
  const env = detectMcpEnvironment();

  // Production configuration (HTTP transport)
  const productionConfig = {
    mcpServers: {
      [serverName]: {
        url: env.httpEndpoint ?? 'https://your-app.vercel.app/api/mcp',
        headers: {
          'x-api-key': apiKey,
        },
      },
    },
  };

  // Local development configuration (stdio transport)
  const localConfig = {
    mcpServers: {
      [serverName]: {
        command: 'node',
        args: ['dist/mcp-server.js'],
        env: {
          HEXFRAME_API_KEY: apiKey,
        },
      },
    },
  };

  // Current environment configuration
  const currentConfig = env.isProduction ? productionConfig : localConfig;

  return {
    production: productionConfig,
    local: localConfig,
    current: currentConfig,
    environment: env,
  };
}

/**
 * Generate user-friendly instructions for MCP setup
 */
export function generateMcpInstructions(apiKey: string, serverName = 'hexframe'): {
  title: string;
  description: string;
  configJson: string;
  steps: string[];
  environment: McpServerEnvironment;
} {
  const { current, environment } = generateMcpConfiguration(apiKey, serverName);

  const isProduction = environment.isProduction;
  const configJson = JSON.stringify(current, null, 2);

  const title = isProduction
    ? 'Production MCP Configuration'
    : 'Local Development MCP Configuration';

  const description = isProduction
    ? 'Use this configuration to connect Claude Desktop to your deployed Hexframe instance.'
    : 'Use this configuration to connect Claude Desktop to your local Hexframe development server.';

  const baseSteps = [
    'Open Claude Desktop',
    'Go to Settings → Developer',
    'Edit your MCP settings file',
    'Add this configuration to your mcpServers section',
    'Save the file and restart Claude Desktop',
  ];

  const additionalSteps = isProduction
    ? ['Your Hexframe instance must be deployed and accessible']
    : [
        'Make sure your local Hexframe server is running (pnpm dev)',
        'Build the MCP server (pnpm mcp:build)',
        'Ensure the dist/mcp-server.js file exists',
      ];

  const steps = [...additionalSteps, ...baseSteps];

  return {
    title,
    description,
    configJson,
    steps,
    environment,
  };
}