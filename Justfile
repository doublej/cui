# CUI Project Commands

# Default: show available commands
default:
    @just --list

# Development
dev:
    @echo "🔗 Auth URL: http://localhost:5173#token=$(cat ~/.cui/config.json | grep authToken | cut -d'"' -f4)"
    bun run dev

# Build for production
build:
    bun run build

# Preview production build
preview:
    bun run preview

# Type checking
check:
    bun run check

check-watch:
    bun run check:watch

typecheck:
    bun run typecheck

# Testing
test:
    bun run test

test-debug:
    bun run test:debug

test-watch:
    bun run test:watch

test-coverage:
    bun run test:coverage

unit-tests:
    bun run unit-tests

integration-tests:
    bun run integration-tests

# Linting
lint:
    bun run lint

# Install dependencies
install:
    bun install

# Clean build artifacts
clean:
    rm -rf .svelte-kit build node_modules/.vite
