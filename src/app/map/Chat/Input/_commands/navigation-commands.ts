import { CoordSystem, Direction } from '~/lib/domains/mapping/utils';

interface Command {
  description: string;
  action?: () => string;
}

export const createNavigationCommands = (center: string | null): Record<string, Command> => ({
  '/move': {
    description: 'Move to adjacent tile (use /move/northwest, /move/northeast, etc.)',
  },
  '/move/northwest': {
    description: 'Move to northwest tile',
    action: (): string => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      try {
        const currentCoord = CoordSystem.parseId(center);
        const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.NorthWest);
        return `Moving to: ${CoordSystem.createId(newCoord)}`;
      } catch (error) {
        return `Error: Failed to parse coordinates - ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  },
  '/move/northeast': {
    description: 'Move to northeast tile',
    action: (): string => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      try {
        const currentCoord = CoordSystem.parseId(center);
        const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.NorthEast);
        return `Moving to: ${CoordSystem.createId(newCoord)}`;
      } catch (error) {
        return `Error: Failed to parse coordinates - ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  },
  '/move/east': {
    description: 'Move to east tile',
    action: (): string => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      try {
        const currentCoord = CoordSystem.parseId(center);
        const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.East);
        return `Moving to: ${CoordSystem.createId(newCoord)}`;
      } catch (error) {
        return `Error: Failed to parse coordinates - ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  },
  '/move/southeast': {
    description: 'Move to southeast tile',
    action: (): string => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      try {
        const currentCoord = CoordSystem.parseId(center);
        const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.SouthEast);
        return `Moving to: ${CoordSystem.createId(newCoord)}`;
      } catch (error) {
        return `Error: Failed to parse coordinates - ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  },
  '/move/southwest': {
    description: 'Move to southwest tile',
    action: (): string => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      try {
        const currentCoord = CoordSystem.parseId(center);
        const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.SouthWest);
        return `Moving to: ${CoordSystem.createId(newCoord)}`;
      } catch (error) {
        return `Error: Failed to parse coordinates - ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  },
  '/move/west': {
    description: 'Move to west tile',
    action: (): string => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      try {
        const currentCoord = CoordSystem.parseId(center);
        const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.West);
        return `Moving to: ${CoordSystem.createId(newCoord)}`;
      } catch (error) {
        return `Error: Failed to parse coordinates - ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }
  },
  '/home': {
    description: 'Navigate to root tile',
  },
  '/parent': {
    description: 'Navigate to parent tile',
  },
});