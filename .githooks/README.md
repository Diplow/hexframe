# Git Hooks

This directory contains Git hooks for the Hexframe project.

## Setup

To use these hooks, configure Git to use this directory:

```bash
git config core.hooksPath .githooks
```

## Available Hooks

### pre-commit

Validates that all color usage follows the design system before allowing commits.

To skip validation temporarily:

```bash
SKIP_COLOR_VALIDATION=true git commit -m "your message"
```

## Disabling Hooks

To disable hooks temporarily:

```bash
git config core.hooksPath .git/hooks
```

To re-enable:

```bash
git config core.hooksPath .githooks
```