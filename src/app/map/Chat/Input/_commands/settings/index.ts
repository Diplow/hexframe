import { toggleCommands } from '~/app/map/Chat/Input/_commands/settings/toggle-commands';
import { infoCommands } from '~/app/map/Chat/Input/_commands/settings/info-commands';
import { helpCommands } from '~/app/map/Chat/Input/_commands/settings/help-commands';

export const settingsCommands = {
  ...helpCommands,
  ...toggleCommands,
  ...infoCommands
};