# Priority 1: Milestone Documentation & Issue Updates

**Type**: #enhancement #workflow #documentation
**Status**: Planning  
**Estimated**: 30 minutes

## Problem Statement
Milestones need proper documentation to provide context for all decisions. Issue commands need updating to use the new workflow structure.

## Success Criteria
- [ ] Milestone documentation exists and is referenced
- [ ] Issue commands use new cycle structure
- [ ] Clear connection between issues and priorities/milestones

## Implementation Plan

### 1. Create Milestone Documentation
- Create `.workflow/milestones/` directory
- Document milestone 1: "Use workflow command to advance Hexframe development"
- Update current.json to reference milestone file by path (not number)

### 2. Update Issue Commands
- Update issue workflow to use `.workflow/cycles/{date}/` structure
- Issues should reference which priority they serve
- Issue commands should check current milestone/priority context

### 3. Verify Context Flow
With CLAUDE.md as the index (from P0):
- Start fresh session
- CLAUDE.md points to current milestone and priorities
- No need for special context loading - it's all indexed

## Notes
Much simpler than original plan - P0's CLAUDE.md index eliminates need for complex context loading. Fresh sessions just read CLAUDE.md and know where everything is.