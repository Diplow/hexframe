#!/bin/bash

echo "Testing Inngest integration locally..."
echo "Setting USE_QUEUE=true to force queue usage"
echo ""
echo "Look for these log messages:"
echo "1. [Agentic Router] Queue configuration"
echo "2. [AgenticFactory] Repository selection"
echo "3. [QueuedLLMRepository] Routing decision"
echo ""
echo "Starting server with USE_QUEUE=true..."
echo "Try sending a message in the chat to see the routing decision"
echo ""

# Start the dev server with queue enabled
USE_QUEUE=true pnpm dev