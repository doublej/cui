# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CUI (Claude UI) is a web-based agent platform that wraps the Claude Agent SDK (`@anthropic-ai/claude-agent-sdk`). It provides a React frontend for interacting with Claude through a Node.js/Express backend that manages Claude queries, SSE streaming, and permission handling.

## Commands

```bash
# Development
bun run dev          # Start backend with tsx watch + Vite dev server
bun run dev:web      # Start only Vite frontend dev server

# Build
bun run build        # Full production build (web + server)
bun run typecheck    # Type checking without emit

# Testing
bun run test                  # Run all tests (vitest)
bun run unit-tests            # Run unit tests only
bun run integration-tests     # Run integration tests only
bun run test -- <pattern>     # Run specific test file
bun run test:coverage         # Run with coverage

# Linting
bun run lint         # ESLint on src/**/*.ts
```

## Architecture

### Backend (Express + TypeScript)

**Entry Points:**
- `src/server.ts` - CLI entrypoint with signal handlers
- `src/cui-server.ts` - Main server class, wires all services and routes

**Core Services (`src/services/`):**
- `claude-agent-service.ts` - Uses Claude Agent SDK's `query()` function, handles permissions via `canUseTool` callback
- `stream-manager.ts` - SSE broadcast to connected web clients per streaming session
- `permission-tracker.ts` - Tracks tool permission requests from SDK callbacks
- `claude-history-reader.ts` - Reads Claude's SQLite session history database

**Key Flow:**
1. Frontend calls `POST /api/conversations/start` with initial prompt
2. `ClaudeAgentService` calls SDK `query()` with async iterator
3. SDK messages are mapped to StreamEvent types and emitted as `claude-message` events
4. `StreamManager` broadcasts events via SSE to connected clients
5. Permission requests handled via `canUseTool` callback -> PermissionTracker -> frontend

### Frontend (React + Vite + Tailwind)

Located in `src/web/` with entry at `src/web/main.tsx`:
- `chat/` - Main chat UI components (ChatApp, MessageList, Composer, ToolRendering)
- `hooks/` - React hooks for streaming, preferences, themes
- `contexts/` - ConversationsContext, PreferencesContext, StreamStatusContext
- Uses Radix UI primitives in `chat/components/ui/`

## Testing

- Uses Vitest with mocked SDK
- Integration tests spawn actual server on random ports (7000-9999)
- Set `LOG_LEVEL=silent` in tests (configured in `tests/setup.ts`)
- Path alias `@/` maps to `src/` in both source and tests

## Key Patterns

- Services are initialized in `CUIServer` constructor and wired together
- Events flow: `ClaudeAgentService` -> `StreamManager` -> SSE clients
- Routes are in `src/routes/` and created with factory functions accepting services
- Auth middleware protects `/api/*` routes except `/api/system`, `/api/permissions`, `/api/notifications`
- Configuration loaded from `~/.cui/config.json` via `ConfigService`
