# Claude Commands

This directory contains custom commands for Claude Code to enhance development workflows.

## Workflow-Driven Development

Commands are organized by workflow phase. Issues and priorities are tracked in `.workflow/cycles/YYYY-MM-DD/` directories, connected to current milestones and priorities.

## Issue Management Workflow

The issue management system follows the workflow structure. Issues are created as priority planning documents in the current cycle directory (`.workflow/cycles/YYYY-MM-DD/<priority>-issue.md`). Each issue references the current milestone and which priority it serves.

### Phase 1: Planning 📋
1. `/issue` - Document the problem from user perspective (required)
2. `/context #<issue>` - Gather codebase context and READMEs (required)
3. `/solution #<issue>` - Document solution approach and strategy (required)
4. `/design #<issue>` - Document UX/UI design principles and visual guidelines (optional but recommended for UI features)
5. `/architecture #<issue>` - Document technical architecture and mental models (optional but recommended)
6. `/tests #<issue>` - Document testing strategy (optional but recommended)

### Phase 2: Implementation 🛠️
7. `/implementation #<issue>` - Implement tests first for TDD (optional but recommended)

### Phase 3: Review 📝
8. `/refactor <file_path>` - Refactor for clarity following Rule of 6 (optional)

To be implemented:
9. `/document <branch>` - Update all relevant documentation (required)
10. `/retro #<issue>` - Capture learnings and insights (optional)
