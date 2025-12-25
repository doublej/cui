# Contributing to CUI (Common Agent UI)

Thank you for your interest in contributing to CUI! This guide will help you get started with contributing to our project.

## Table of Contents

- [Project Overview](#project-overview)
- [Development Setup](#development-setup)
- [Testing Requirements](#testing-requirements)
- [Contribution Guidelines](#contribution-guidelines)
- [Submitting Changes](#submitting-changes)

## Project Overview

CUI is a web-based agent platform that wraps the Claude Agent SDK, consisting of:
- TypeScript Express backend that manages Claude queries via SDK
- React frontend with Tailwind CSS
- Single-port architecture (port 3001)
- Real-time streaming via SSE (Server-Sent Events)
- Permission handling via SDK callbacks

### Architecture

#### Backend Services (`src/services/`)
- **ClaudeAgentService**: Uses Claude Agent SDK's `query()` function, handles permissions via `canUseTool` callback
- **StreamManager**: SSE broadcast to connected web clients per streaming session
- **ClaudeHistoryReader**: Reads conversation history from ~/.claude directory
- **PermissionTracker**: Tracks tool permission requests from SDK callbacks
- **SessionInfoService**: Manages extended session metadata
- **ConfigService**: Loads configuration from ~/.cui/config.json

#### Frontend (`src/web/`)
- **chat/**: Main chat UI components (ChatApp, MessageList, Composer, ToolRendering)
- **chat/contexts/**: ConversationsContext, PreferencesContext, StreamStatusContext
- **chat/hooks/**: React hooks for streaming, preferences, themes
- **chat/components/ui/**: Radix UI primitives

#### API Routes (`src/routes/`)
- Conversations API: Start, list, get, continue, stop conversations
- Streaming API: Real-time conversation updates
- Permissions API: MCP permission approval/denial
- System API: Status and available models

## Development Setup

### Prerequisites
- Node.js >= 20.19.0
- Bun (package manager)
- Git

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/BMPixel/cui.git
   cd cui
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Start development server:
   ```bash
   bun run dev  # Backend + frontend on port 3001
   ```

### Essential Commands

```bash
bun run dev          # Start dev server
bun run build        # Build both frontend and backend
bun run test         # Run all tests
bun run typecheck    # TypeScript type checking
bun run lint         # ESLint checking
```

### Development Gotchas

- Do not run `bun run dev` to verify frontend updates during testing
- Enable debug logs with: `LOG_LEVEL=debug bun run dev`

## Testing Requirements

### Running Tests

```bash
bun run test                # Run all tests
bun run unit-tests          # Run unit tests only
bun run integration-tests   # Run integration tests only
bun run test:coverage       # Generate coverage report
bun run test:watch          # Watch mode for TDD
bun run test:debug          # Verbose output for debugging
```

### Test Coverage Requirements

All pull requests must meet the following coverage thresholds:
- **Lines**: 75%
- **Functions**: 80%
- **Branches**: 60%
- **Statements**: 75%

The CI pipeline will automatically check these thresholds. To verify locally:
```bash
bun run test:coverage
```

### Writing Tests

- Write comprehensive unit tests for all new features
- Include integration tests for API endpoints
- Mock external dependencies appropriately
- Follow existing test patterns in the codebase
- Use descriptive test names that explain the behavior being tested

## Contribution Guidelines

### Code Style

1. **TypeScript Best Practices**:
   - Use strict typing - avoid `any`, `undefined`, `unknown` types
   - Follow existing type patterns in the codebase
   - Utilize Zod schemas for runtime validation

2. **Coding Standards**:
   - Follow the project's ESLint configuration
   - Use path aliases (e.g., `@/services/...`) for imports
   - Ensure proper cleanup of event listeners in streaming logic
   - Never expose or log secrets/keys

3. **Key Patterns to Follow**:
   - **Streaming Architecture**: Use SSE (Server-Sent Events) for real-time updates
   - **SDK Integration**: Use Claude Agent SDK's `query()` with async iterators
   - **Error Handling**: Use custom error types with proper HTTP status codes
   - **Frontend**: Use React Router v6 for navigation

### Creating Issues

When creating an issue, please include:
- Clear description of the problem or feature request
- Steps to reproduce (for bugs)
- Expected vs actual behavior
- System information (OS, Node version)
- Relevant logs or error messages

Use appropriate labels:
- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Documentation improvements
- `good first issue` - Good for newcomers

### Pull Request Process

1. **Before Creating a PR**:
   - Create an issue first to discuss the change
   - Fork the repository and create a feature branch
   - Ensure all tests pass: `bun run test`
   - Run linting: `bun run lint`
   - Run type checking: `bun run typecheck`
   - Add/update tests for your changes
   - Update documentation if needed

2. **PR Format**:
   ```markdown
   ## Description
   Brief description of changes

   ## Related Issue
   Fixes #(issue number)

   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Coverage requirements met
   - [ ] Manual testing completed

   ## Checklist
   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   ```

3. **After Creating a PR**:
   - Ensure CI pipeline passes
   - Respond to review feedback promptly
   - Keep PR up to date with main branch

## Submitting Changes

1. **Small, Focused Changes**: Keep PRs small and focused on a single issue
2. **Commit Messages**: Use clear, descriptive commit messages
3. **Testing**: All new features must include tests
4. **Documentation**: Update relevant documentation
5. **Breaking Changes**: Discuss in an issue first

### Important Implementation Notes

- Permission requests are handled via SDK's `canUseTool` callback
- Ensure proper cleanup when modifying streaming logic
- Test with Node.js >= 20.19.0

## Getting Help

- Check existing issues and PRs first
- Ask questions in issue discussions
- Review the CLAUDE.md file for project-specific guidance
- Enable debug logging for troubleshooting

Thank you for contributing to CUI! Your efforts help make this project better for everyone.