# Phase 1: Fix Chat Message Rendering

**Objective**: Improve the visual presentation of messages in the chat timeline to be more readable and professional.

## Current Problems

### 1. Poor Message Layout
Messages currently display with awkward line breaks and excessive spacing:
```
[timestamp] 
You:
This is my message content
```

### 2. Basic "Thinking" Indicator  
When AI is processing, users only see a basic "Thinking..." text with pulse animation.

### 3. Jarring Widget Transitions
AI response widget appears/disappears instantly with no smooth transitions.

## Implementation Tasks

### Task 1: Fix Message Layout (MessageActorRenderer.tsx)

**Current Code Location**: `/src/app/map/Chat/Timeline/MessageActorRenderer.tsx`

**Current Implementation** (lines 71-83):
```tsx
return (
  <div className="w-full">
    <div className="text-sm">
      <TimestampRenderer timestamp={message.timestamp} />
      {renderActorLabel()}  // This creates a line break!
      <MarkdownRenderer 
        content={message.content} 
        isSystemMessage={message.actor === 'system'} 
      />
    </div>
  </div>
);
```

**Required Change**: Make timestamp and actor label inline with message content (Slack-style):
```tsx
return (
  <div className="w-full">
    <div className="text-sm flex items-start gap-2">
      <span className="text-xs text-muted-foreground shrink-0">
        <TimestampRenderer timestamp={message.timestamp} />
      </span>
      <span className="font-medium shrink-0">
        {renderActorLabel()}
      </span>
      <div className="flex-1">
        <MarkdownRenderer 
          content={message.content} 
          isSystemMessage={message.actor === 'system'} 
        />
      </div>
    </div>
  </div>
);
```

**Also Update renderActorLabel()** to return just the text without colons:
- Change `{user ? 'You:' : 'Guest (you):'}` to `{user ? 'You' : 'Guest'}`
- Change `HexFrame:` to `HexFrame`
- Change `System:` to `System`

### Task 2: Improve Thinking Indicator (ChatPanel.tsx)

**Current Code Location**: `/src/app/map/Chat/ChatPanel.tsx` (lines 45-49)

**Current Implementation**:
```tsx
{isThinking && (
  <div className="text-gray-500 text-sm animate-pulse">
    Thinking...
  </div>
)}
```

**Required Change**: Add a better visual indicator with dots animation:
```tsx
{isThinking && (
  <div className="flex items-center gap-2 text-muted-foreground text-sm p-3 bg-muted/50 rounded-lg">
    <div className="flex gap-1">
      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
    </div>
    <span>HexFrame is thinking</span>
  </div>
)}
```

### Task 3: Add Smooth Transitions (AIResponseWidget)

**Current Code Location**: `/src/app/map/Chat/Timeline/Widgets/AIResponseWidget/index.tsx`

**Current Status Rendering** (around line 140-160, look for the status-based styling):

**Required Changes**:
1. Add transition classes to the main container
2. Use color transitions based on status:
   - `pending`: yellow background/border
   - `processing`: orange background/border  
   - `completed`: green background/border
   - `failed`: red background/border

```tsx
// Add to the widget container className
className={cn(
  "transition-all duration-300 ease-in-out",
  status === 'pending' && "bg-yellow-50 border-yellow-200",
  status === 'processing' && "bg-orange-50 border-orange-200",
  status === 'completed' && "bg-green-50 border-green-200",
  status === 'failed' && "bg-red-50 border-red-200"
)}
```

### Task 4: Fix Timestamp Display (TimestampRenderer.tsx)

**Current Code Location**: `/src/app/map/Chat/Timeline/TimestampRenderer.tsx`

**Current Format**: Shows with colons like `10:30:45`

**Required Change**: Remove colons, use simple format like `10:30` and make it gray/muted

## Testing Instructions

1. Start dev server: `pnpm dev`
2. Navigate to any map
3. Send a message to test layout (should be inline, no line breaks)
4. Send another message to AI to test thinking indicator (should show animated dots)
5. Watch AI response widget transitions (should smoothly change colors)

## Success Criteria

✅ Messages display in single line: `[timestamp] [actor] message content here`
✅ Thinking indicator shows animated dots with "HexFrame is thinking" text
✅ AI widget smoothly transitions between yellow → orange → green colors
✅ No line breaks between message components
✅ Professional, readable chat interface similar to Slack

## Files to Modify

1. `/src/app/map/Chat/Timeline/MessageActorRenderer.tsx` - Fix message layout
2. `/src/app/map/Chat/ChatPanel.tsx` - Improve thinking indicator
3. `/src/app/map/Chat/Timeline/Widgets/AIResponseWidget/index.tsx` - Add transitions
4. `/src/app/map/Chat/Timeline/TimestampRenderer.tsx` - Simplify timestamp format

## DO NOT

- ❌ Add edit/delete functionality for messages
- ❌ Modify the chat state management or reducers
- ❌ Add new event types
- ❌ Change the backend or API
- ❌ Create new components (only modify existing ones)

## Notes

- This is purely a UI/presentation layer change
- Use Tailwind CSS classes for all styling
- Keep changes minimal and focused on visual improvements only
- The goal is better readability and smoother user experience