# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CUI (Claude UI) is a web-based agent platform that wraps the Claude Code CLI (`@anthropic-ai/claude-code`). It provides a React frontend for interacting with Claude through a Node.js/Express backend that manages Claude CLI processes, SSE streaming, and MCP (Model Context Protocol) integration.

## Commands

```bash
# Development
npm run dev          # Start backend with tsx watch + Vite dev server
npm run dev:web      # Start only Vite frontend dev server

# Build
npm run build        # Full production build (web + server + MCP)
npm run typecheck    # Type checking without emit

# Testing
npm test                      # Run all tests
npm run unit-tests            # Run unit tests only
npm run integration-tests     # Run integration tests only
npm test -- <pattern>         # Run specific test file
npm run test:coverage         # Run with coverage

# Linting
npm run lint         # ESLint on src/**/*.ts
```

## Architecture

### Backend (Express + TypeScript)

**Entry Points:**
- `src/server.ts` - CLI entrypoint with signal handlers
- `src/cui-server.ts` - Main server class, wires all services and routes

**Core Services (`src/services/`):**
- `claude-process-manager.ts` - Spawns/manages Claude CLI child processes, emits events for stdout/close/errors
- `stream-manager.ts` - SSE broadcast to connected web clients per streaming session
- `permission-tracker.ts` - Tracks tool permission requests from MCP server
- `claude-history-reader.ts` - Reads Claude's SQLite session history database
- `json-lines-parser.ts` - Parses JSONL stream from Claude CLI stdout

**Key Flow:**
1. Frontend calls `POST /api/conversations` with initial prompt
2. `ClaudeProcessManager` spawns Claude CLI with `--output-format stream-json`
3. JSONL messages are parsed and emitted as `claude-message` events
4. `StreamManager` broadcasts events via SSE to connected clients
5. MCP server handles permission requests through `POST /api/permissions/notify`

### Frontend (React + Vite + Tailwind)

Located in `src/web/` with entry at `src/web/main.tsx`:
- `chat/` - Main chat UI components (ChatApp, MessageList, Composer, ToolRendering)
- `hooks/` - React hooks for streaming, preferences, themes
- `contexts/` - ConversationsContext, PreferencesContext, StreamStatusContext
- Uses Radix UI primitives in `chat/components/ui/`

### MCP Server (`src/mcp-server/`)

A separate MCP server process that handles permission prompts from Claude CLI. Gets spawned with each conversation and communicates back to CUI server via HTTP.

## Testing

- Uses Vitest with `tests/__mocks__/claude` mock executable
- Integration tests spawn actual server on random ports (9000-9999)
- Set `LOG_LEVEL=silent` in tests (configured in `tests/setup.ts`)
- Path alias `@/` maps to `src/` in both source and tests

## Key Patterns

- Services are initialized in `CUIServer` constructor and wired together
- Events flow: `ClaudeProcessManager` -> `StreamManager` -> SSE clients
- Routes are in `src/routes/` and created with factory functions accepting services
- Auth middleware protects `/api/*` routes except `/api/system`, `/api/permissions`, `/api/notifications`
- Configuration loaded from `~/.config/cui/config.json` via `ConfigService`
