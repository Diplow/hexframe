import { useChatState } from '~/app/map/Chat';
import { useMapCache } from '~/app/map/Cache';
import { useCommandHandlers } from '~/app/map/Chat/Input/_hooks/useCommandHandlers';
import { useSpecialCommands } from '~/app/map/Chat/Input/_hooks/useSpecialCommands';
import { useCommandExecution } from '~/app/map/Chat/Input/_hooks/useCommandExecution';
import { useCommandSuggestions } from '~/app/map/Chat/Input/_hooks/useCommandSuggestions';

export function useCommandHandling() {
  const chatState = useChatState();
  const { center } = useMapCache();

  // Get extended commands with special runtime commands
  const { extendedCommands } = useSpecialCommands(center);
  
  // Get command handlers
  const handlers = useCommandHandlers(chatState);
  
  // Get command execution functionality
  const { findCommand, executeCommand } = useCommandExecution(extendedCommands, handlers);
  
  // Get command suggestion functionality  
  const { getCommandSuggestions } = useCommandSuggestions(extendedCommands);

  return {
    findCommand,
    getCommandSuggestions,
    executeCommand
  };
}