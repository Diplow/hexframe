# Issue: Integrate Real LLM into Hexframe Chat

**Date**: 2025-07-25
**Status**: Open
**Tags**: #feature #agentic #chat #architecture #high
**GitHub Issue**: #90
**Branch**: issue-001-llm-integration-hexframe-chat

## Problem Statement
I would like to plug a real LLM into the hexframe chat. For starter it would have the current center and the next 2 generations in its context and the current chat timeline. It would be capable to use a claude code instance (we would have to check if it is possible first). This is a big feature that involves creating a new domain "agentic".

## User Impact
- Users will be able to interact with a real LLM within Hexframe chat
- The LLM will have contextual awareness of the current tile hierarchy (center + 2 generations)
- Users can leverage AI capabilities directly within their hexagonal mapping workflows
- Enables integration with Claude Code for enhanced development capabilities

## Requirements
1. LLM Integration
   - Connect to a real LLM service (e.g., Claude API)
   - Provide tile context (current center + next 2 generations)
   - Include current chat timeline in context

2. Claude Code Integration
   - Investigate feasibility of Claude Code instance integration
   - Enable LLM to use Claude Code capabilities if possible

3. New Domain Structure
   - Create new "agentic" domain for AI-related functionality
   - Follow existing domain patterns and architecture

## Technical Considerations
- API integration with LLM service
- Context management and token optimization
- Real-time chat interface updates
- Security and API key management
- Rate limiting and cost considerations

## Related Issues
- None currently identified