# Hexframe Workflow System

A living workflow that keeps development focused and productive.

## Overview

The workflow operates in cycles, each progressing through defined phases:

1. **Goals** → Review/adjust high-level objectives
2. **Prioritization** → Select top items from backlog
3. **Planification** → Create detailed implementation plans  
4. **Execution** → Build and ship
5. **Retrospective** → Learn what worked
6. **Research** → Validate with real usage

## Key Files

- **`.workflow/current.json`** - Current state and progress
- **`.workflow/backlog/`** - All identified work items (bugs, features, UX, tech debt)
- **`.workflow/cycles/`** - Documentation for each cycle
- **`.workflow/milestones/`** - High-level goals and progress

## Backlog System

The backlog (`.workflow/backlog/`) contains all identified work:
- `bugs.md` - Known issues affecting users
- `features.md` - New capabilities and improvements
- `ux.md` - User experience enhancements
- `tech-debt.md` - Technical improvements and cleanup

During the **Prioritization phase**, items are selected from the backlog based on:
- User impact
- System integrity
- Technical risk  
- Quick win potential

## Current Status

Check `.workflow/current.json` to see:
- Which phase we're in
- Current priorities
- Progress on tasks
- Blockers

## Philosophy

This workflow embodies Hexframe's belief that systems must stay alive through use. It's designed to:
- Prevent system thinkers from getting lost in meta-work
- Keep focus on shipping value to users
- Capture ideas without losing momentum
- Ensure deliberate decisions about system changes

The workflow itself is dogfooded - we use it to improve itself.