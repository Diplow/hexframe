# Chat State Management

State management for the Chat feature using a reducer-based architecture.

## Structure

- **core/** - Core state definitions and reducer
- **_events/** - Event types and handlers
- **_hooks/** - React hooks for state access
- **_operations/** - Complex operations and side effects
- **_reducers/** - State update logic
- **_selectors/** - State derivation and queries
- **docs/** - Documentation components and UI

## Architecture

This follows a unidirectional data flow pattern:
1. User actions dispatch events
2. Reducers update state
3. Selectors derive computed values
4. Hooks provide React integration
5. Operations handle complex async logic

## Usage

```typescript
import { useChatState } from '~/app/map/Chat/_state';

function ChatComponent() {
  const { state, dispatch } = useChatState();
  // ...
}
```
