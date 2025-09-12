import { toggleCommands } from './toggle-commands';
import { infoCommands } from './info-commands';
import { helpCommands } from './help-commands';

export const settingsCommands = {
  ...helpCommands,
  ...toggleCommands,
  ...infoCommands
};