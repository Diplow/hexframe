# Priority 0: Establish Baseline Context

**Type**: #enhancement #workflow #foundation
**Status**: Planning
**Estimated**: 45 minutes
**Priority**: CRITICAL - Everything depends on this

## Problem Statement
The AI lacks comprehensive context about Hexframe. CLAUDE.md exists but needs to become a proper index pointing to all key documents rather than duplicating information. Without good baseline context, every interaction requires re-explanation.

## Success Criteria
- [ ] CLAUDE.md serves as clear index to all key documents
- [ ] All foundational aspects of Hexframe are documented and referenced
- [ ] AI has access to mission, culture, thesis, target user, domains, workflow
- [ ] No duplication of information - just clear references

## Implementation Plan

### 1. Update CLAUDE.md Structure
Transform into an index with sections:
- **Project Overview**: Brief intro, then → company/MISSION.md
- **Culture & Philosophy**: → company/CULTURE.md  
- **Target User**: → company/TARGET_USER.md (to be created)
- **Technical Architecture**: → src/lib/domains/README.md
- **Workflow System**: → .workflow/README.md
- **Current Status**: → .workflow/current.json

### 2. Create Missing Documents
- [ ] company/TARGET_USER.md - Who are system thinkers?
- [ ] company/THESIS.md - Why now? Why this approach? (or add to MISSION)

### 3. Ensure CLAUDE.md Points to Workflow State
- Reference `.workflow/current.json` for current phase/milestone
- Reference `.workflow/cycles/[current]/` for active priorities
- Make it clear this is always the starting point for context

### 4. Test Context Loading
- Verify AI can access all referenced documents
- Ensure no circular references
- Confirm context is comprehensive but not overwhelming

## Notes
This is Priority 0 because all other priorities depend on the AI having proper context. Without this, we're constantly re-explaining Hexframe's purpose and structure.