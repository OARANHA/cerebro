#!/usr/bin/env node
import chalk from 'chalk'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join } from 'path'
import {
  getAllProjectMemoryDirs,
  getMemoryEntrypoint,
  getLogFiles,
  parseLogFile,
  parseMemoryFile,
  scoreAllEntries,
  projectNameFromDir,
} from '@cerebro/core'

/**
 * Replicates the internal /dream skill from Claude Code.
 * Distills daily log files into a consolidated MEMORY.md.
 * 
 * The original /dream in Claude Code is behind a feature flag (KAIROS).
 * Cerebro makes it available to everyone.
 */
export async function dream(options: { since?: string; project?: string; dryRun?: boolean }) {
  const sinceDays = options.since
    ? parseSinceDays(options.since)
    : 7

  console.log(chalk.bold.magenta(`\n✨ Cerebro Dream — distilling last ${sinceDays} days\n`))

  const dirs = options.project
    ? [join(options.project, 'memory')]
    : getAllProjectMemoryDirs()

  for (const dir of dirs) {
    const name = projectNameFromDir(dir)
    console.log(chalk.bold(`📁 ${name}`))

    const logFiles = getLogFiles(dir)
    const now = Date.now()
    const cutoff = now - sinceDays * 86_400_000

    const recentLogs = logFiles.filter(f => {
      const match = f.match(/(\d{4}-\d{2}-\d{2})\.md$/)
      if (!match) return false
      const d = new Date(match[1]).getTime()
      return d >= cutoff
    })

    if (recentLogs.length === 0) {
      console.log(chalk.dim('  No log files in the specified range.\n'))
      continue
    }

    console.log(chalk.dim(`  Processing ${recentLogs.length} log files...`))

    // Read and merge all logs
    const logContents = recentLogs.map(f => parseLogFile(f))
    const merged = logContents
      .map(l => `### ${l.date}\n\n${l.content}`)
      .join('\n\n---\n\n')

    // Extract existing memories for context
    const memFile = getMemoryEntrypoint(dir)
    const existing = parseMemoryFile(memFile)
    const scores = scoreAllEntries(existing, logContents.map(l => l.content))

    // Build the distilled summary
    // In the full version this would call an LLM; here we do structural distillation
    const distilled = distillLogs(logContents.map(l => l.content), sinceDays)

    if (options.dryRun) {
      console.log(chalk.dim('\n  [DRY RUN] Would append to MEMORY.md:'))
      console.log(chalk.dim('  ' + distilled.slice(0, 200) + '...'))
    } else {
      // Append distilled content to MEMORY.md
      const current = existsSync(memFile) ? readFileSync(memFile, 'utf-8') : ''
      const header = `\n\n## Dream — ${new Date().toISOString().slice(0, 10)}\n\n`
      writeFileSync(memFile, current + header + distilled)
      console.log(chalk.green(`  ✓ Appended dream distillation to MEMORY.md`))
    }

    // Report at-risk memories after distillation
    const atRisk = existing.filter(e => scores.get(e.id)?.riskOfGC)
    if (atRisk.length > 0) {
      console.log(chalk.yellow(`  ⚠ ${atRisk.length} memories still at risk — run: cerebro gc`))
    }

    console.log()
  }
}

/**
 * Structural distillation: extracts key patterns from log content.
 * In production, replace this with an LLM call to Claude API.
 */
function distillLogs(logs: string[], sinceDays: number): string {
  const allText = logs.join('\n')

  // Count keyword frequency
  const lines = allText.split('\n').filter(l => l.trim().length > 20)
  const decisions = lines.filter(l => /\b(decided|chose|use|prefer|always|never)\b/i.test(l))
  const errors = lines.filter(l => /\b(error|bug|fix|fail|broke)\b/i.test(l))
  const patterns = lines.filter(l => /\b(pattern|convention|standard|rule)\b/i.test(l))

  const sections: string[] = []

  if (decisions.length > 0) {
    sections.push(`### Decisions (last ${sinceDays}d)\n\n` + decisions.slice(0, 5).map(l => `- ${l.trim()}`).join('\n'))
  }
  if (errors.length > 0) {
    sections.push(`### Errors & Fixes (last ${sinceDays}d)\n\n` + errors.slice(0, 5).map(l => `- ${l.trim()}`).join('\n'))
  }
  if (patterns.length > 0) {
    sections.push(`### Patterns Observed (last ${sinceDays}d)\n\n` + patterns.slice(0, 5).map(l => `- ${l.trim()}`).join('\n'))
  }

  if (sections.length === 0) {
    return `No significant patterns detected in the last ${sinceDays} days.`
  }

  return sections.join('\n\n')
}

function parseSinceDays(since: string): number {
  const match = since.match(/^(\d+)d?$/)
  return match ? parseInt(match[1], 10) : 7
}

// CLI entry
if (process.argv[1]?.includes('dream')) {
  const args = process.argv.slice(2)
  const since = args.find(a => a.startsWith('--since='))?.split('=')[1]
  const project = args.find(a => a.startsWith('--project='))?.split('=')[1]
  const dryRun = args.includes('--dry-run')

  dream({ since, project, dryRun })
}
