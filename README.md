# 🧠 Cerebro

> Second brain for Claude Code — open-source what Anthropic kept internal.

Cerebro reads the auto-memory files that Claude Code already writes to `~/.claude/projects/*/memory/` and adds the intelligence layer that Anthropic reserved for internal users only.

## What Anthropic has vs what Cerebro delivers

| Anthropic (internal only) | Cerebro (open source) |
|---|---|
| `/remember` → `USER_TYPE=ant` only | `cerebro remember` for everyone |
| `/dream` → internal feature flag | `cerebro dream` public command |
| No memory dashboard | Dashboard with graph + RFM score |
| No manual GC | `cerebro gc` with configurable threshold |
| No cross-project visibility | `cerebro serve` shows all projects |

## Install

```bash
npm install -g @oaranha/cerebro
# or
bun install -g @oaranha/cerebro
```

## Commands

### `cerebro serve` — Dashboard
```bash
cerebro serve          # opens dashboard at http://localhost:7700
cerebro serve --port 3000
```

### `cerebro remember` — GC + Promote
```bash
cerebro remember           # proposes promotions from auto-memory
cerebro remember --apply   # applies approved promotions
```

### `cerebro gc` — Garbage Collection
```bash
cerebro gc                 # list memories candidates for deletion
cerebro gc --threshold 7   # GC memories with >7 days without access
cerebro gc --apply         # actually delete
```

### `cerebro dream` — Nightly Distillation
```bash
cerebro dream              # distills week logs into MEMORY.md
cerebro dream --since 30d  # distills last 30 days
```

## How it works

Claude Code already writes memory files to disk:
```
~/.claude/projects/<sanitized-git-root>/memory/MEMORY.md
~/.claude/projects/<sanitized-git-root>/memory/logs/YYYY/MM/YYYY-MM-DD.md
```

Cerebro watches those files, parses them, and adds:
- **RFM Score** (Recency + Frequency + Monetary) for each memory entry
- **Relationship graph** from `related_to` links in Markdown
- **Promotion pipeline** replicating the internal `/remember` skill
- **Dream distillation** replicating the internal `/dream` skill

## Architecture

```
cerebro/
├── packages/
│   ├── cli/          # Phase 3 — cerebro remember / gc
│   ├── serve/        # Phase 2 — cerebro serve (Express + Vite dashboard)
│   └── dream/        # Phase 4 — cerebro dream distiller
├── apps/
│   └── dashboard/    # React + Vite frontend
└── packages/core/    # Shared: filesystem reader, RFM score, parser
```

## Memory path (confirmed from Claude Code source)

Auto-memory is stored at:
```
~/.claude/projects/{sanitized(git-root)}/memory/
```

Decay algorithm: `Math.floor((Date.now() - mtime) / 86_400_000)` — plain days since last modification.

---

Inspired by reverse-engineering [sanbuphy/claude-code-source-code](https://github.com/sanbuphy/claude-code-source-code).
