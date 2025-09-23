# AIResponseWidget

## Mental Model
Think of the AIResponseWidget as a **real-time package tracker for AI deliveries** - it monitors AI jobs from dispatch through processing to final delivery, providing live status updates and displaying the contents when they arrive. Like tracking a package online, it shows "shipped", "in transit", "delivered", or "delivery failed" with appropriate visual feedback.

## Responsibilities
- Poll AI job status in real-time using tRPC queries with exponential backoff
- Display appropriate visual states (pending/processing/completed/failed/direct)
- Track and show elapsed time for running jobs
- Inject custom CSS animations for progress indicators
- Render AI response content using markdown when completed
- Handle error states with user-friendly messages
- Support both async job tracking and direct response display

## Non-Responsibilities
- AI job creation or execution → See `~/lib/domains/agentic/README.md`
- Markdown content rendering → Uses `~/app/map/Chat/Timeline/_components/MarkdownRenderer`
- Base widget styling and layout → Uses `~/app/map/Chat/Timeline/Widgets/_shared/README.md`
- Job queuing or scheduling → Handled by calling components
- Authentication or authorization → Handled by API layer

## Interface
See `index.ts` for the public API - exports `AIResponseWidget` component only.
See `dependencies.json` for what this subsystem can import.

Note: This subsystem has no child components - it's a leaf node that focuses solely on AI response display and status tracking.