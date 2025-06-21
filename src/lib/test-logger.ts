/**
 * Test-only logger that outputs helpful debugging information
 * Only logs when E2E_TEST environment variable is set
 * 
 * IMPORTANT: Server-side logs appear in the terminal/server output, NOT in the browser console
 * Client-side logs appear in the browser console and can be captured by Playwright
 */

// For server-side: check process.env
const isServerTestEnvironment = 
  typeof process !== 'undefined' && process.env.E2E_TEST === 'true';

// For client-side: check multiple indicators
const isClientTestEnvironment = 
  typeof window !== 'undefined' && (
    // Check if we're running in Playwright
    window.navigator?.userAgent?.includes('HeadlessChrome') ||
    window.navigator?.webdriver === true ||
    // Check our custom flag (set by layout.tsx)
    (window as unknown as { __E2E_TEST__?: boolean }).__E2E_TEST__ === true ||
    // Check URL for test indicators
    (window.location?.hostname === 'localhost' && 
     (window.location?.port === '3001' || window.location?.port === '3002'))
  );

const isTestEnvironment = isServerTestEnvironment || isClientTestEnvironment;

// Helper to format logs consistently
const formatLog = (type: string, message: string, data?: unknown): string => {
  const timestamp = new Date().toISOString();
  const dataStr = data ? JSON.stringify(data, null, 2) : '';
  return `[TEST-${type}] ${timestamp} - ${message}${dataStr ? '\n' + dataStr : ''}`;
};

export const testLogger = {
  info: (message: string, data?: unknown) => {
    if (isTestEnvironment) {
      console.info(formatLog('INFO', message, data));
    }
  },
  
  debug: (message: string, data?: unknown) => {
    if (isTestEnvironment) {
      console.debug(formatLog('DEBUG', message, data));
    }
  },
  
  error: (message: string, error?: unknown) => {
    if (isTestEnvironment) {
      console.error(formatLog('ERROR', message, error));
    }
  },
  
  // Log component renders with props
  component: (componentName: string, props?: Record<string, unknown>) => {
    if (isTestEnvironment) {
      console.info(formatLog('COMPONENT', `${componentName} rendered`, props));
    }
  },
  
  // Log user interactions
  interaction: (action: string, target: string, details?: unknown) => {
    if (isTestEnvironment) {
      console.info(formatLog('INTERACTION', `${action} on ${target}`, details));
    }
  },

  // Log server-side only (for debugging server components)
  server: (message: string, data?: unknown) => {
    if (isServerTestEnvironment) {
      console.log(`\n🔵 [SERVER-LOG] ${message}`, data ? data : '');
    }
  }
};

// Helper to log tile information
export const logTileInfo = (tileId: string, action: string, details?: unknown) => {
  testLogger.info(`Tile ${tileId}: ${action}`, details);
};