export interface DebugLogConfig {
  prefix: string[];
  data?: Record<string, unknown>;
}

export interface DebugLoggerOptions {
  enableConsole?: boolean;
  enableUI?: boolean;
  blacklistedPrefixes?: string[]; // Prefixes that should never log to UI
  maxBufferSize?: number;
}

export interface DebugLogEntry {
  timestamp: number;
  prefix: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface GroupedLogEntry {
  timestamp: number;
  prefix: string;
  message: string;
  data?: Record<string, unknown>;
  count: number;
  firstTimestamp: number;
  lastTimestamp: number;
}

// Global debug log buffer that exists outside React
const debugLogBuffer: DebugLogEntry[] = [];

// Debug settings
let debugSettings: DebugLoggerOptions = {
  enableConsole: false, // Disabled by default as requested
  enableUI: false,
  blacklistedPrefixes: ['DEBUG', 'RENDER', 'CHAT'], // Prevent chat/render logs from going to UI
  maxBufferSize: 2000, // Store last 2000 logs
};

export class DebugLogger {
  private static instance: DebugLogger;
  private subscribers = new Set<(logs: DebugLogEntry[]) => void>();
  
  private constructor() {
    // Buffer maintenance is now handled in the log method
  }
  
  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }
  
  setOptions(options: Partial<DebugLoggerOptions>): void {
    debugSettings = { ...debugSettings, ...options };
  }
  
  getOptions(): DebugLoggerOptions {
    return { ...debugSettings };
  }
  
  log(config: DebugLogConfig & { message: string }): void {
    const prefixString = config.prefix.map(p => `[${p}]`).join('');
    const timestamp = Date.now();
    
    // Always add to buffer (for /debug command access)
    debugLogBuffer.push({
      timestamp,
      prefix: prefixString,
      message: config.message,
      data: config.data,
    });
    
    // Maintain buffer size limit
    const maxSize = debugSettings.maxBufferSize ?? 2000;
    if (debugLogBuffer.length > maxSize) {
      debugLogBuffer.splice(0, debugLogBuffer.length - maxSize);
    }
    
    // Log to console only if explicitly enabled
    if (debugSettings.enableConsole) {
      const style = 'color: #888; font-weight: bold;';
      const dataString = config.data ? ` | Data: ${JSON.stringify(config.data, null, 2)}` : '';
      console.log(`%c${prefixString}%c ${config.message}${dataString}`, style, 'color: inherit;');
    }
    
    // Check if this prefix is blacklisted for UI
    const isBlacklisted = debugSettings.blacklistedPrefixes?.some(blacklisted => 
      prefixString.includes(`[${blacklisted}]`)
    );
    
    // Notify subscribers for UI display if enabled and not blacklisted
    if (debugSettings.enableUI && !isBlacklisted) {
      this.notifySubscribers();
    }
  }
  
  // Subscribe to log updates (for external UI components)
  subscribe(callback: (logs: DebugLogEntry[]) => void): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }
  
  private notifySubscribers(): void {
    // Debounce notifications to prevent too many updates
    if (this.notifyTimeout) {
      clearTimeout(this.notifyTimeout);
    }
    
    this.notifyTimeout = setTimeout(() => {
      this.subscribers.forEach(callback => {
        callback([...debugLogBuffer]);
      });
    }, 100);
  }
  
  private notifyTimeout?: NodeJS.Timeout;
  
  // Get current buffer (for initial render)
  getBuffer(): DebugLogEntry[] {
    return [...debugLogBuffer];
  }
  
  // Clear the buffer
  clearBuffer(): void {
    debugLogBuffer.length = 0;
    this.notifySubscribers();
  }
  
  // Get logs in full mode (all details)
  getFullLogs(): DebugLogEntry[] {
    return [...debugLogBuffer];
  }
  
  // Get logs in succinct mode with grouping by prefix only
  getSuccinctLogs(): GroupedLogEntry[] {
    const grouped: GroupedLogEntry[] = [];
    let currentGroup: GroupedLogEntry | null = null;
    
    for (const log of debugLogBuffer) {
      // In succinct mode, we only group by prefix (not message or data)
      if (currentGroup && currentGroup.prefix === log.prefix) {
        // Update the existing group
        currentGroup.count++;
        currentGroup.lastTimestamp = log.timestamp;
      } else {
        // Start a new group
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        currentGroup = {
          timestamp: log.timestamp,
          prefix: log.prefix,
          message: log.message, // Keep first message for reference
          data: log.data, // Keep first data for reference
          count: 1,
          firstTimestamp: log.timestamp,
          lastTimestamp: log.timestamp,
        };
      }
    }
    
    // Don't forget the last group
    if (currentGroup) {
      grouped.push(currentGroup);
    }
    
    return grouped;
  }
  
  // Generate a short identifier based on log prefix and data
  private generateShortIdentifier(prefix: string, message: string, data?: Record<string, unknown>): string {
    let identifier = '';
    
    // Handle canvas render logs
    if (prefix.includes('[RENDER][CANVAS]')) {
      if (data?.coordId) {
        identifier = `coord:${String(data.coordId).slice(0, 10)}`;
      } else if (data?.center) {
        identifier = `center:${String(data.center).slice(0, 8)}`;
      } else if (data?.tileId) {
        identifier = `tile:${String(data.tileId).slice(0, 10)}`;
      } else if (data?.frameId) {
        identifier = `frame:${String(data.frameId).slice(0, 9)}`;
      } else if (data?.itemCount !== undefined) {
        identifier = `items:${String(data.itemCount)}`;
      }
    } 
    // Handle API logs
    else if (prefix.includes('[API]')) {
      // Handle tRPC patterns: "tRPC QUERY: user.getUserMap"
      const trpcMatch = /^tRPC\s+(QUERY|MUTATION|SUBSCRIPTION):\s+(.+)/.exec(message);
      if (trpcMatch?.[2]) {
        const apiPath = trpcMatch[2];
        // Add relevant argument if available
        if (data?.input) {
          const inputStr = typeof data.input === 'object' && data.input !== null ? 
            Object.keys(data.input).slice(0, 2).join(',') : 
            String(data.input).slice(0, 10);
          identifier = `${apiPath} ${inputStr}`;
        } else {
          identifier = apiPath;
        }
      }
      // Handle tRPC server patterns: "TRPC SERVER QUERY: user.getUserMap"
      else if (/^TRPC SERVER\s+(QUERY|MUTATION|SUBSCRIPTION):\s+(.+)/.exec(message)) {
        const serverMatch = /^TRPC SERVER\s+\w+:\s+(.+)/.exec(message);
        if (serverMatch?.[1]) {
          const apiPath = serverMatch[1];
          if (data?.rawInput || data?.input) {
            const input = data.rawInput || data.input;
            const inputStr = typeof input === 'object' && input !== null ? 
              Object.keys(input).slice(0, 2).join(',') : 
              String(input).slice(0, 10);
            identifier = `${apiPath} ${inputStr}`;
          } else {
            identifier = apiPath;
          }
        }
      }
      // Handle auth client patterns: "AUTH CLIENT POST: /api/auth/sign-in"
      else if (/^AUTH CLIENT\s+(GET|POST|PUT|DELETE|PATCH):\s+(.+)/.exec(message)) {
        const authMatch = /^AUTH CLIENT\s+\w+:\s+(.+)/.exec(message);
        if (authMatch?.[1]) {
          const endpoint = authMatch[1];
          // Extract just the action part from auth endpoints
          const actionMatch = /\/api\/auth\/(.+)/.exec(endpoint);
          if (actionMatch?.[1]) {
            identifier = `auth.${actionMatch[1]}`;
          } else {
            identifier = endpoint.slice(0, 20);
          }
        }
      }
      // Handle generic HTTP patterns: "GET /api/..."
      else if (/^(GET|POST|PUT|DELETE|PATCH)\s+(.+)/.exec(message)) {
        const httpMatch = /^(GET|POST|PUT|DELETE|PATCH)\s+(.+)/.exec(message);
        if (httpMatch?.[2]) {
          const endpoint = httpMatch[2].slice(0, 20);
          identifier = endpoint;
        }
      }
      // Handle response/error patterns
      else if (message.includes('RESPONSE:') || message.includes('ERROR:')) {
        const responseMatch = /(RESPONSE|ERROR):\s+([^\s(]+)/.exec(message);
        if (responseMatch?.[2]) {
          const apiName = responseMatch[2];
          const status = data?.status ? ` ${String(data.status)}` : '';
          const duration = data?.duration ? ` ${String(data.duration)}ms` : '';
          identifier = `${apiName}${status}${duration}`.slice(0, 30);
        }
      }
      // Fallback patterns
      else if (data?.endpoint) {
        identifier = String(data.endpoint).slice(0, 20);
      } else if (data?.path) {
        identifier = String(data.path).slice(0, 20);
      } else if (data?.status) {
        identifier = `status:${String(data.status)}`;
      }
    }
    // Handle map cache handler logs
    else if (prefix.includes('[MAPCACHE][HANDLERS]')) {
      // Extract handler method name from message like "[NavigationHandler.navigateToItem] Called with:"
      const handlerMatch = /\[(.*?)\]/.exec(message);
      if (handlerMatch?.[1]) {
        const handlerName = handlerMatch[1].slice(0, 20);
        // Add the main argument if available
        if (data?.itemDbId) {
          identifier = `${handlerName} ${String(data.itemDbId).slice(0, 8)}`;
        } else if (data?.itemCoordId) {
          identifier = `${handlerName} ${String(data.itemCoordId).slice(0, 8)}`;
        } else if (data?.centerCoordId) {
          identifier = `${handlerName} ${String(data.centerCoordId).slice(0, 8)}`;
        } else if (data?.parentCoordId) {
          identifier = `${handlerName} ${String(data.parentCoordId).slice(0, 8)}`;
        } else if (data?.regionKey) {
          identifier = `${handlerName} ${String(data.regionKey).slice(0, 8)}`;
        } else if (data?.itemId) {
          identifier = `${handlerName} ${String(data.itemId).slice(0, 8)}`;
        } else {
          identifier = handlerName;
        }
      } else if (data?.tileId) {
        identifier = `tile:${String(data.tileId).slice(0, 10)}`;
      } else if (data?.region) {
        identifier = `region:${String(data.region).slice(0, 8)}`;
      } else if (data?.coordId) {
        identifier = `coord:${String(data.coordId).slice(0, 10)}`;
      }
    }
    // Handle event bus logs
    else if (prefix.includes('[EVENTBUS]')) {
      if (data?.type) {
        identifier = String(data.type).slice(0, 20);
      } else if (message.includes('Event')) {
        // Try to extract event type from message
        const eventMatch = /Event[^:]*:\s*(\S+)/.exec(message);
        if (eventMatch?.[1]) {
          identifier = eventMatch[1].slice(0, 20);
        }
      }
    }
    // Handle chat render logs
    else if (prefix.includes('[RENDER][CHAT]')) {
      // For Input component, show "Input component rendered"
      if (message.includes('Input component')) {
        identifier = 'Input component rendered';
      } else if (data?.actor) {
        identifier = `actor:${String(data.actor).slice(0, 8)}`;
      } else if (data?.messageId) {
        identifier = `msg:${String(data.messageId).slice(0, 12)}`;
      } else if (data?.type) {
        identifier = `type:${String(data.type).slice(0, 10)}`;
      }
    }
    // Handle hierarchy render logs
    else if (prefix.includes('[RENDER][HIERARCHY]')) {
      // Differentiate between ParentHierarchy and UserProfileTile
      if (message.includes('ParentHierarchy')) {
        if (data?.effectiveCenter) {
          identifier = `ParentHierarchy ${String(data.effectiveCenter).slice(0, 8)}`;
        } else {
          identifier = 'ParentHierarchy';
        }
      } else if (message.includes('UserProfileTile')) {
        if (data?.hasUser && data?.userId) {
          identifier = `UserProfileTile ${String(data.userId).slice(0, 8)}`;
        } else if (data?.userName) {
          identifier = `UserProfileTile ${String(data.userName).slice(0, 8)}`;
        } else {
          identifier = `UserProfileTile ${data?.hasUser ? 'logged' : 'guest'}`;
        }
      } else if (message.includes('DynamicHierarchyTile')) {
        if (data?.coordId) {
          identifier = `DynamicHierarchyTile ${String(data.coordId).slice(0, 8)}`;
        } else {
          identifier = 'DynamicHierarchyTile';
        }
      } else if (data?.nodeId) {
        identifier = `node:${String(data.nodeId).slice(0, 10)}`;
      } else if (data?.level !== undefined) {
        identifier = `level:${String(data.level)}`;
      }
    }
    
    // Fallback: use everything before "|" in the message if no specific identifier found
    if (!identifier) {
      const beforePipe = message.split('|')[0]?.trim();
      if (beforePipe && beforePipe !== message) {
        identifier = beforePipe.slice(0, 30);
      }
    }
    
    // Ensure identifier is at most 30 characters
    return identifier.slice(0, 30);
  }

  // Format logs for display with options
  formatLogs(mode: 'full' | 'succinct' = 'full', limit?: number): string[] {
    if (mode === 'full') {
      const logs = this.getFullLogs();
      const logsToFormat = limit ? logs.slice(-limit) : logs;
      return logsToFormat.map(log => {
        const time = new Date(log.timestamp).toLocaleTimeString();
        const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
        return `${time} ${log.prefix} ${log.message}${dataStr}`;
      });
    } else {
      const groups = this.getSuccinctLogs();
      const groupsToFormat = limit ? groups.slice(-limit) : groups;
      return groupsToFormat.map(group => {
        const time = new Date(group.firstTimestamp).toLocaleTimeString();
        const countStr = group.count > 1 ? `(${group.count}) ` : '';
        const identifier = this.generateShortIdentifier(group.prefix, group.message, group.data);
        const identifierStr = identifier ? ` ${identifier}` : '';
        const timeRange = group.count > 1 
          ? ` [${new Date(group.firstTimestamp).toLocaleTimeString()} - ${new Date(group.lastTimestamp).toLocaleTimeString()}]`
          : '';
        return `${countStr}${time} ${group.prefix}${identifierStr}${timeRange}`;
      });
    }
  }
  
  // Convenience method for creating a logger with preset prefix
  createLogger(prefix: string[]): (message: string, data?: Record<string, unknown>) => void {
    return (message: string, data?: Record<string, unknown>) => {
      this.log({ prefix, message, data });
    };
  }
}

export const debugLogger = DebugLogger.getInstance();

// Pre-configured loggers for common use cases
export const loggers = {
  eventBus: debugLogger.createLogger(['DEBUG', 'EVENTBUS']),
  mapCache: {
    handlers: debugLogger.createLogger(['DEBUG', 'MAPCACHE', 'HANDLERS'])
  },
  api: debugLogger.createLogger(['DEBUG', 'API']),
  chat: {
    handlers: debugLogger.createLogger(['DEBUG', 'CHAT'])
  },
  render: {
    canvas: debugLogger.createLogger(['DEBUG', 'RENDER', 'CANVAS']),
    chat: debugLogger.createLogger(['DEBUG', 'RENDER', 'CHAT']),
    hierarchy: debugLogger.createLogger(['DEBUG', 'RENDER', 'HIERARCHY'])
  },
  agentic: Object.assign(
    debugLogger.createLogger(['DEBUG', 'AGENTIC']),
    {
      error: debugLogger.createLogger(['DEBUG', 'AGENTIC', 'ERROR'])
    }
  )
};