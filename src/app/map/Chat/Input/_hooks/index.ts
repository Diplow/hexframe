/**
 * Public API for Chat Input Hooks subsystem
 */

// Autocomplete
export { useAutocompleteLogic } from '~/app/map/Chat/Input/_hooks/autocomplete/useAutocompleteLogic';
export { useFavoritesAutocomplete, type FavoriteMatch } from '~/app/map/Chat/Input/_hooks/autocomplete/use-favorites-autocomplete';

// Commands
export { useCommandHandling } from '~/app/map/Chat/Input/_hooks/commands/useCommandHandling';

// Input Control
export { useInputHistory } from '~/app/map/Chat/Input/_hooks/input-control/useInputHistory';
export { useTextareaController } from '~/app/map/Chat/Input/_hooks/input-control/useTextareaController';

// Messages
export { useEventProcessor } from '~/app/map/Chat/Input/_hooks/messages/useEventProcessor';
export { useMessageHandling } from '~/app/map/Chat/Input/_hooks/messages/useMessageHandling';

// Streaming
export { useStreamingTaskExecution } from '~/app/map/Chat/Input/_hooks/streaming/useStreamingTaskExecution';
