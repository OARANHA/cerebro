# Contributing to Cerebro

Cerebro is built on top of the memory filesystem that Claude Code already writes to `~/.claude/`.

## Architecture

```
packages/core    → filesystem reader, parser, RFM scorer
packages/serve   → Express API + WebSocket server
packages/cli     → `cerebro` CLI (remember / gc / serve)
packages/dream   → log distiller (dream command)
apps/dashboard   → React + Vite frontend
```

## Dev setup

```bash
bun install
bun run dev
```

## Testing locally

Make sure you have used Claude Code at least once so `~/.claude/projects/` exists.

```bash
# Start dashboard
bun run serve

# Review memories
bun run remember

# GC dry run
bun run gc

# Distill logs
bun run dream --dry-run
```
