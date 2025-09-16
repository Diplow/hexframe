import { debugLogger } from '~/lib/debug/debug-logger';
import { toBase64 } from '~/app/map/Chat/Input/_commands/debug/debug-utils';

interface Command {
  description: string;
  action?: () => string;
}

export const debugCommands: Record<string, Command> = {
  '/debug': {
    description: 'Show debug logs with interactive controls',
    action: () => {
      // Start with default: full mode, last 100 logs
      const logs = debugLogger.formatLogs('full', 100);
      if (logs.length === 0) {
        return 'No debug logs available.';
      }

      // Remove timestamps from individual log lines since we'll show timestamp in the header
      const cleanLogs = logs.map(log => {
        // Remove timestamp pattern like "2:55:56 PM [DEBUG]..."
        return log.replace(/^\d{1,2}:\d{2}:\d{2}\s+[AP]M\s+/, '');
      });

      const logContent = cleanLogs.join('\n');

      return `\`\`\`\n${logContent}\n\`\`\`

{{INTERACTIVE_CONTROLS:${toBase64(logContent)}}}`;
    }
  }
};