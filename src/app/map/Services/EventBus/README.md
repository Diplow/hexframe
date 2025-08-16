# EventBus Subsystem

Event-driven communication system for the map application.

## Purpose
Provides a centralized event bus for decoupled communication between map components and services.

## Core Components
- `event-bus.ts` - Core EventBus class implementation
- `event-bus-context.tsx` - React context and provider for EventBus
- `interface.ts` - Public API exports

## Usage
Components and services can emit and listen to application events through the EventBus.