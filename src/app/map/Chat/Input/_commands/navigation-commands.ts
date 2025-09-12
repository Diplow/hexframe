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
    action: () => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      const currentCoord = CoordSystem.parseId(center);
      const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.NorthWest);
      return `Moving to: ${CoordSystem.createId(newCoord)}`;
    }
  },
  '/move/northeast': {
    description: 'Move to northeast tile',
    action: () => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      const currentCoord = CoordSystem.parseId(center);
      const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.NorthEast);
      return `Moving to: ${CoordSystem.createId(newCoord)}`;
    }
  },
  '/move/east': {
    description: 'Move to east tile',
    action: () => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      const currentCoord = CoordSystem.parseId(center);
      const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.East);
      return `Moving to: ${CoordSystem.createId(newCoord)}`;
    }
  },
  '/move/southeast': {
    description: 'Move to southeast tile',
    action: () => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      const currentCoord = CoordSystem.parseId(center);
      const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.SouthEast);
      return `Moving to: ${CoordSystem.createId(newCoord)}`;
    }
  },
  '/move/southwest': {
    description: 'Move to southwest tile',
    action: () => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      const currentCoord = CoordSystem.parseId(center);
      const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.SouthWest);
      return `Moving to: ${CoordSystem.createId(newCoord)}`;
    }
  },
  '/move/west': {
    description: 'Move to west tile',
    action: () => {
      if (!center) {
        return 'Error: Current position unknown. Cannot navigate.';
      }
      const currentCoord = CoordSystem.parseId(center);
      const newCoord = CoordSystem.getNeighborCoord(currentCoord, Direction.West);
      return `Moving to: ${CoordSystem.createId(newCoord)}`;
    }
  },
  '/home': {
    description: 'Navigate to root tile',
  },
  '/parent': {
    description: 'Navigate to parent tile',
  },
});