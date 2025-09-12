import { debugLogger } from '~/lib/debug/debug-logger';

// UTF-8 safe base64 encoder
function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

interface Command {
  description: string;
  action?: () => string;
}

export const debugCommands: Record<string, Command> = {
  '/debug': {
    description: 'Show debug logs (use /debug/full or /debug/succinct)',
  },
  '/debug/full': {
    description: 'Show last 50 full debug logs (use /debug/full/X for custom limit)',
  },
  '/debug/full/10': {
    description: 'Show last 10 full debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('full', 10);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Full Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/full/25': {
    description: 'Show last 25 full debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('full', 25);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Full Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/full/50': {
    description: 'Show last 50 full debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('full', 50);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Full Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/succinct': {
    description: 'Show last 50 succinct debug logs (use /debug/succinct/X for custom limit)',
  },
  '/debug/succinct/10': {
    description: 'Show last 10 succinct debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('succinct', 10);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Succinct Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/succinct/25': {
    description: 'Show last 25 succinct debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('succinct', 25);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Succinct Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  },
  '/debug/succinct/50': {
    description: 'Show last 50 succinct debug logs',
    action: () => {
      const logs = debugLogger.formatLogs('succinct', 50);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }
      const logContent = logs.join('\n');
      return `**Debug Logs (Succinct Mode - ${logs.length} messages):**\n\n\`\`\`\n${logContent}\n\`\`\`\n\n{{COPY_BUTTON:${toBase64(logContent)}}}`;
    }
  }
};