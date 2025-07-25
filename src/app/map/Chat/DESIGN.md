# Design: LLM Integration for Hexframe Chat

## Overview
This design document outlines the user experience for integrating LLM capabilities into Hexframe's chat interface. The design prioritizes seamless integration with existing chat patterns while providing intelligent assistance based on tile context.

## Design Goals
- **Invisible Intelligence**: LLM assistance feels natural, not intrusive
- **Context-Aware**: Responses understand the current tile hierarchy
- **Progressive Disclosure**: Advanced features added without cluttering initial experience
- **Trust & Safety**: Clear indicators when AI is active, with security considerations

## Design Principles

### Conversational Continuity
The LLM integration maintains the existing chat metaphor. Users continue typing naturally, with AI responses appearing as assistant messages in the conversation flow.

### Contextual Awareness
The AI understands the user's current focus (center tile + 2 generations), providing relevant suggestions without requiring explicit context setting.

### Transparent AI
Users always know when they're interacting with AI through clear visual indicators and message attribution.

## Visual Design

### Message Types
```
User Message:
┌─────────────────────────────┐
│ You                    10:30 │
│ "Help me organize this..."   │
└─────────────────────────────┘

AI Assistant Message:
┌─────────────────────────────┐
│ 🤖 AI Assistant        10:31 │
│ "Based on your Product       │
│ Development tile..."         │
└─────────────────────────────┘
```

### Visual Indicators
- **AI Badge**: 🤖 icon prefix for AI messages
- **Processing**: Subtle animation while generating response
- **Context Indicator**: Small tile count badge showing context scope

### Color Usage (Following Design System)
- AI Messages: `bg-purple-50 dark:bg-purple-950/20` (subtle purple from SW position)
- User Messages: `bg-slate-50 dark:bg-slate-900` (standard chat background)
- Processing: `bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50` animation
- Error States: `bg-rose-50 dark:bg-rose-950/20` (using W position destructive color)

## Interaction Design

### User Flow
1. **Natural Input**: User types in existing chat input
2. **Automatic Detection**: System recognizes when to engage AI
3. **Context Building**: Tile hierarchy automatically included
4. **Response Generation**: AI processes with visual feedback
5. **Display Response**: Assistant message appears in chat

### Trigger Patterns
- Questions about tiles: "What's in my Product tile?"
- Organization requests: "Help me structure these ideas"
- Suggestions: "What should I add to Marketing?"
- Summaries: "Summarize my project tiles"

### Feedback Patterns
- **Processing**: Three dots animation with "AI is thinking..." text
- **Success**: Smooth message appearance with subtle fade-in
- **Error**: Gentle error message with retry option
- **Rate Limit**: Clear message about usage limits

## Component Specifications

### AI Message Component
```typescript
interface AIMessageProps {
  content: string;
  timestamp: Date;
  status: 'generating' | 'complete' | 'error';
  model?: string; // For future model display
  tokenCount?: number; // For future usage tracking
}
```

States:
- **Generating**: `animate-pulse bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50`
- **Complete**: `bg-purple-50 dark:bg-purple-950/20`
- **Error**: `bg-rose-50 dark:bg-rose-950/20` with retry button

### Chat Input Enhancement
- No visual changes in v1
- Maintains existing input behavior
- Seamless AI integration without new UI elements

## Accessibility Considerations

### Screen Reader Support
- AI messages announced with "AI Assistant says:"
- Processing state announced: "AI is generating response"
- Error states clearly communicated

### Keyboard Navigation
- Tab through messages
- Enter to retry failed requests
- Escape to cancel processing (future)

### Visual Accessibility
- High contrast between user and AI messages
- Color not sole indicator (icons + labels)
- Clear focus states

## Error States

### Rate Limit Exceeded
```
┌─────────────────────────────┐
│ 🤖 AI Assistant        10:31 │
│ ⚠️ Daily limit reached.      │
│ Resets in 3 hours.          │
└─────────────────────────────┘
```

### Network Error
```
┌─────────────────────────────┐
│ 🤖 AI Assistant        10:31 │
│ ❌ Connection error.         │
│ [Try Again]                 │
└─────────────────────────────┘
```

### Invalid Context
```
┌─────────────────────────────┐
│ 🤖 AI Assistant        10:31 │
│ ℹ️ I need a selected tile    │
│ to provide context.         │
└─────────────────────────────┘
```

## Security Indicators

### Safe Response
- Standard AI message appearance
- No additional warnings needed

### Filtered Content
```
┌─────────────────────────────┐
│ 🤖 AI Assistant        10:31 │
│ 🛡️ Response filtered for    │
│ safety. Try rephrasing.     │
└─────────────────────────────┘
```

## Design Decisions & Rationale

### No Dedicated AI Widget (v1)
**Choice**: Integrate directly into existing chat
**Rationale**: Reduces complexity, faster implementation, natural UX
**Future**: Widget for model selection and advanced features

### Automatic Context Inclusion
**Choice**: Always include tile hierarchy without user action
**Rationale**: Reduces friction, ensures relevant responses
**Trade-off**: Slightly higher token usage

### Subtle AI Differentiation
**Choice**: Light purple tint using SW spatial color (creative insight)
**Rationale**: 
- Purple represents creative/insightful thinking in our spatial system
- Maintains chat cohesion while indicating AI source
- Follows design system dual-purpose color philosophy
**Alternative**: Considered violet (primary) but too prominent for messages

## Implementation Notes

### Tailwind Implementation
```tsx
// AI Message component classes
const aiMessageClasses = {
  base: 'bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4',
  generating: 'animate-pulse bg-gradient-to-r from-purple-50 via-violet-50 to-purple-50',
  complete: 'bg-purple-50 dark:bg-purple-950/20',
  error: 'bg-rose-50 dark:bg-rose-950/20'
};

// Usage
<div className={cn(
  aiMessageClasses.base,
  status === 'generating' && aiMessageClasses.generating,
  status === 'error' && aiMessageClasses.error
)}>
  {/* Message content */}
</div>
```

### Animation Performance
- Use CSS transforms for processing animation
- Debounce typing indicators
- Lazy load error retry buttons

### Component Structure
- Extend existing ChatMessage component
- Add AIMessage variant
- Reuse existing timestamp and layout logic

## Future Enhancements

### Phase 2: Model Selection
- Dropdown in chat header
- Model badges on messages
- Cost indicators

### Phase 3: Advanced Controls
- Temperature slider
- Context depth selector
- Conversation memory toggle
- Token usage dashboard

## Success Metrics
- Response time < 2s for 95% of requests
- Error rate < 1%
- User engagement increase of 30%
- Positive feedback on AI helpfulness