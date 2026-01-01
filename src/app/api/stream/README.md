# SSE Streaming API

Real-time Server-Sent Events (SSE) endpoint for streaming task execution feedback.

## Mental Model

The streaming API replaces polling-based updates with a **persistent connection** that delivers events in real-time. Think of it as a one-way data pipeline: the client opens a connection, and the server pushes events as they happen during task execution.

```
Client                                  Server
  |                                       |
  |------- GET /api/stream/execute-task -->|
  |                                       |
  |<-------- text_delta: "Processing" ----|
  |<-------- text_delta: "the task" ------|
  |<-------- text_delta: "..." -----------|
  |                                       |
  |<-------- done: {totalTokens, ms} -----|
  |                                       |
  X (connection closed)                   X
```

**Key insight:** SSE is unidirectional (server-to-client), making it simpler than WebSockets while perfectly suited for streaming LLM responses.

## Responsibilities

### 1. Authentication
- Session-based authentication (cookies)
- API key authentication (x-api-key header)
  - Internal API keys for MCP sessions
  - External API keys via better-auth

### 2. Orchestration
- Creates domain services (MappingService, AgenticService)
- Fetches hexecute context from mapping domain
- Ensures hexplan exists (creates if missing)

### 3. Streaming
- Creates ReadableStream for SSE transport
- Calls pure agentic service for LLM streaming
- Maintains connection until completion or error

### 4. Event Formatting
- SSE format: `data: {json}\n\n`
- JSON-serialized event payloads
- Proper escaping of newlines and special characters

## Endpoint Reference

### `GET /api/stream/execute-task`

Streams task execution events via Server-Sent Events.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `taskCoords` | string | Yes | - | Coordinates of the task tile (e.g., `userId,0:1,2`) |
| `instruction` | string | No | - | Runtime instruction for task execution |
| `model` | string | No | `claude-opus-4-20250514` | LLM model to use |
| `temperature` | number | No | - | Generation temperature (0-2) |
| `maxTokens` | number | No | - | Maximum tokens (1-8192) |

#### Authentication

One of:
- Session cookie (browser requests)
- `x-api-key` header with internal/external API key
- `x-user-id` header hint (for internal API keys)

#### Response Headers

```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
```

#### Error Responses

| Status | Condition |
|--------|-----------|
| 400 | Invalid parameters (missing/invalid taskCoords, etc.) |
| 401 | Missing or invalid authentication |

## Event Types

All events follow SSE format: `data: {json}\n\n`

### `text_delta`
Incremental text from LLM response.

```json
{"type": "text_delta", "text": "Processing your request..."}
```

### `done`
Stream completion with optional metrics.

```json
{"type": "done", "totalTokens": 1500, "durationMs": 3200}
```

### `error`
Error with code and recoverability hint.

```json
{
  "type": "error",
  "code": "RATE_LIMIT",
  "message": "Rate limit exceeded",
  "recoverable": true
}
```

#### Error Codes
- `RATE_LIMIT` - API rate limit exceeded (recoverable)
- `INVALID_API_KEY` - Invalid API key (non-recoverable)
- `CONTEXT_LENGTH_EXCEEDED` - Token limit exceeded (non-recoverable)
- `NETWORK_ERROR` - Network issues (recoverable)
- `TIMEOUT` - Request timeout (recoverable)
- `UNKNOWN` - Unhandled error (non-recoverable)

## Usage Examples

### JavaScript/TypeScript (EventSource)

```typescript
const url = new URL('/api/stream/execute-task', window.location.origin);
url.searchParams.set('taskCoords', 'userId123,0:1,2');
url.searchParams.set('instruction', 'Focus on error handling');

const eventSource = new EventSource(url.toString());

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'text_delta':
      console.log('Text:', data.text);
      break;
    case 'done':
      console.log('Complete:', data.totalTokens, 'tokens in', data.durationMs, 'ms');
      eventSource.close();
      break;
    case 'error':
      console.error('Error:', data.code, data.message);
      if (!data.recoverable) eventSource.close();
      break;
  }
};

eventSource.onerror = () => {
  console.error('Connection error');
  eventSource.close();
};
```

### With API Key

```typescript
// EventSource doesn't support custom headers, use fetch instead
const response = await fetch(url.toString(), {
  headers: {
    'x-api-key': 'your-api-key',
    'x-user-id': 'user-id-hint'  // Optional, for internal keys
  }
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (reader) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n\n').filter(line => line.startsWith('data: '));

  for (const line of lines) {
    const event = JSON.parse(line.substring(6));
    // Handle event...
  }
}
```

### cURL

```bash
curl -N "http://localhost:3000/api/stream/execute-task?taskCoords=userId,0:1" \
  -H "x-api-key: your-api-key"
```

## Architecture

```
route.ts (API layer - orchestration)
    |
    |-- Validate params
    |-- Authenticate
    |-- Create services (orchestration)
    |   |-- IAM: getOrCreateInternalApiKey()
    |   |-- Mapping: MappingService
    |   |-- Agentic: AgenticService
    |
    |-- Get hexecute context (mapping domain)
    |-- Ensure hexplan exists (mapping domain)
    |
    |-- Create ReadableStream
    |   |
    |   v
    |   executeTaskStreaming() (agentic domain - pure)
    |   |-- Build hexecute prompt
    |   |-- Stream LLM response
    |   |-- Callback emits SSE events
    |
    |<-- SSE events to client
```

### Key Components

| File | Responsibility |
|------|----------------|
| `route.ts` | HTTP handling, auth, validation, orchestration, SSE response |
| `~/lib/domains/agentic` | Pure LLM streaming via `executeTaskStreaming()` |
| `~/lib/domains/mapping` | Hexecute context, hexplan tile creation |
| `~/lib/domains/iam` | Internal API key management |

## Subsystems

### `execute-task/`
Main streaming endpoint for task execution.

- `route.ts` - Next.js route handler
- `__tests__/route.test.ts` - Unit tests
