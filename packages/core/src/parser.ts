import { readFileSync, statSync } from 'fs'
import { existsSync } from 'fs'

export interface MemoryEntry {
  id: string
  content: string
  tags: string[]
  relatedTo: string[]
  filePath: string
  mtimeMs: number
  ageDays: number
  layer: 'auto' | 'claude_md' | 'claude_local_md'
}

/**
 * Age in days — exact same algorithm as Claude Code's memoryAge.ts
 * Math.floor((Date.now() - mtime) / 86_400_000)
 */
export function memoryAgeDays(mtimeMs: number): number {
  return Math.max(0, Math.floor((Date.now() - mtimeMs) / 86_400_000))
}

export function memoryAgeLabel(mtimeMs: number): string {
  const d = memoryAgeDays(mtimeMs)
  if (d === 0) return 'today'
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

/**
 * Parses a MEMORY.md file into individual MemoryEntry objects.
 * Each H2 section (## Title) is treated as one memory.
 */
export function parseMemoryFile(filePath: string): MemoryEntry[] {
  if (!existsSync(filePath)) return []

  const raw = readFileSync(filePath, 'utf-8')
  const stat = statSync(filePath)
  const mtimeMs = stat.mtimeMs

  const sections = raw.split(/^## /m).slice(1)
  return sections.map((section, i) => {
    const lines = section.split('\n')
    const title = lines[0]?.trim() ?? `entry-${i}`
    const body = lines.slice(1).join('\n').trim()

    // Extract tags: lines starting with - tag: or #hashtag
    const tags = [...body.matchAll(/#(\w+)/g)].map(m => m[1])

    // Extract related_to links: [text](../other) or related: [x, y]
    const relatedTo = [...body.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)].map(m => m[1])

    return {
      id: `${filePath}::${title}`,
      content: body,
      tags,
      relatedTo,
      filePath,
      mtimeMs,
      ageDays: memoryAgeDays(mtimeMs),
      layer: 'auto' as const,
    }
  })
}

/**
 * Parses a daily log file into raw text events (lighter than full MemoryEntry)
 */
export interface LogEvent {
  date: string
  content: string
  filePath: string
}

export function parseLogFile(filePath: string): LogEvent {
  const raw = readFileSync(filePath, 'utf-8')
  const dateMatch = filePath.match(/(\d{4}-\d{2}-\d{2})\.md$/)
  return {
    date: dateMatch?.[1] ?? 'unknown',
    content: raw,
    filePath,
  }
}
