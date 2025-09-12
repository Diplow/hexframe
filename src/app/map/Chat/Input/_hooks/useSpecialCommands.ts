import { useMemo } from 'react';
import { CoordSystem } from '~/lib/domains/mapping/utils';
import { getAllCommands, type Command } from '~/app/map/Chat/Input/_commands';

// UTF-8 safe base64 encoder
function toBase64(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

/**
 * Custom hook for creating extended commands with runtime data
 */
export function useSpecialCommands(center: string | null) {
  const baseCommands = getAllCommands(center);
  
  const extendedCommands = useMemo(() => ({
    ...baseCommands,
    '/clear': {
      description: 'Clear message timeline',
      action: () => {
        // This will be handled specially in executeCommand
        return '';
      }
    },
    '/coords': {
      description: 'Get current center coordinate in JSON format',
      action: () => {
        if (!center) {
          return 'No current center coordinate available.';
        }
        
        try {
          const coords = CoordSystem.parseId(center);
          const coordsJson = JSON.stringify(coords, null, 0);
          return `Current center coordinates: \`${coordsJson}\`\n\n{{COPY_BUTTON:${toBase64(coordsJson)}}}`;
        } catch (error) {
          return `Error parsing coordinate: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    }
  }), [baseCommands, center]);

  return { extendedCommands };
}