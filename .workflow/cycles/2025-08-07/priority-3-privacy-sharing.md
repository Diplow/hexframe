# Priority 2: Privacy Controls + Basic Sharing

## Context
Enable users to share their living systems while maintaining privacy control. This bridges personal system creation with collaborative system evolution.

## Core Features
1. **Privacy Settings** - Public/private toggle for maps and individual hexagons
2. **Basic Sharing** - Share-by-link functionality for public maps
3. **Forking** - Clone public maps as starting points for new systems
4. **Access Control** - View-only vs. collaborative permissions

## Success Criteria
- [ ] Users can mark maps as public/private
- [ ] Private maps remain completely inaccessible to others
- [ ] Public maps can be shared via links
- [ ] Forking creates independent copies
- [ ] Privacy settings are clearly visible and easy to change

## Impact
**High** - Enables the social aspects of system thinking. Allows successful systems to be shared and evolved by the community.

## Dependencies
- Requires stable core functionality (Priority 0)
- Enhanced by MCP integration (Priority 1) for AI-assisted sharing
- Provides foundation for community features

## Estimated Effort
**Medium-High** - Requires authentication, authorization, database changes, and UI for privacy controls.

## Implementation Notes
- Start with simple public/private toggle
- Design for future granular permissions
- Consider federation possibilities
- Ensure privacy-by-default design

## Privacy and AI Context Isolation

### Key Requirement
Private tiles must be completely isolated from AI context unless the AI is explicitly working for the tile owner.

### Context Filtering
- When AI assists user A, it should NOT see:
  - Private tiles from user B
  - Private subsystems linked from public tiles
  - Private content in forked systems
  
### Owner Access
- When AI assists the owner:
  - Full access to their private tiles
  - Can reference private content in conversations
  - Can suggest improvements to private systems

### Sharing Scenarios
1. **Public System with Private Subsystems**
   - Public tiles visible to all
   - Private linked tiles show as "Private System" placeholder
   - AI cannot traverse into private areas

2. **Forking Private Systems**
   - Fork creates owner's private copy
   - Original private system remains inaccessible
   - Attribution preserved without exposing content

3. **Collaborative Systems**
   - Multiple owners could have mixed private/public tiles
   - Each user's AI only sees their accessible portions
   - Prevents information leakage through AI responses

### Technical Implementation
- Server-side filtering before sending to AI
- User context validation on every AI request
- Clear visual indicators for private vs public
- Audit trail for AI access to tiles

### Privacy Principles
1. **Default Private**: New tiles private until explicitly shared
2. **No Inference**: AI can't infer private content from public context
3. **Clear Boundaries**: Users understand what AI can/cannot see
4. **Owner Control**: Full control over privacy settings