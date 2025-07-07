import { useChatCache } from '../ChatCacheProvider';

export function useChatCacheOperations() {
  const { state, dispatch, eventBus } = useChatCache();

  return {
    messages: state.visibleMessages,
    widgets: state.activeWidgets,
    events: state.events,
    dispatch,
    eventBus,
  };
}