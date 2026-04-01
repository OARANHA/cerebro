import chalk from 'chalk'
import { unlinkSync, readFileSync, writeFileSync } from 'fs'
import {
  getAllProjectMemoryDirs,
  getMemoryEntrypoint,
  getLogFiles,
  parseMemoryFile,
  parseLogFile,
  scoreAllEntries,
  projectNameFromDir,
} from '@cerebro/core'

export async function gc(options: { threshold: string; apply?: boolean; project?: string }) {
  const threshold = parseInt(options.threshold, 10)
  console.log(chalk.bold.cyan(`\n🗑 Cerebro GC — threshold: ${threshold} days\n`))

  const dirs = options.project
    ? [options.project]
    : getAllProjectMemoryDirs()

  let totalFound = 0

  for (const dir of dirs) {
    const name = projectNameFromDir(dir)
    console.log(chalk.bold(`📁 ${name}`))

    const memFile = getMemoryEntrypoint(dir)
    const entries = parseMemoryFile(memFile)
    const logContents = getLogFiles(dir).map(f => parseLogFile(f).content)
    const scores = scoreAllEntries(entries, logContents)

    const candidates = entries.filter(e => {
      const score = scores.get(e.id)
      return e.ageDays >= threshold || (score?.riskOfGC ?? false)
    })

    if (candidates.length === 0) {
      console.log(chalk.green('  ✓ No stale memories found\n'))
      continue
    }

    console.log(chalk.yellow(`  Found ${candidates.length} stale memories:\n`))

    for (const e of candidates) {
      const score = scores.get(e.id)
      console.log(chalk.red(`  ✗ ${e.content.slice(0, 70).trim()}`))
      console.log(chalk.dim(`    Age: ${e.ageDays} days | Score: ${score?.total ?? 0}`))
    }

    totalFound += candidates.length

    if (options.apply) {
      // Remove stale sections from MEMORY.md
      const raw = readFileSync(memFile, 'utf-8')
      const staleIds = new Set(candidates.map(e => e.id.split('::').pop()))
      const sections = raw.split(/^## /m)
      const kept = sections.filter(s => {
        const title = s.split('\n')[0]?.trim()
        return !staleIds.has(title)
      })
      writeFileSync(memFile, kept.join('## '))
      console.log(chalk.green(`  ✓ Removed ${candidates.length} stale entries from MEMORY.md`))
    }

    console.log()
  }

  if (!options.apply && totalFound > 0) {
    console.log(chalk.yellow(`Run with --apply to delete ${totalFound} stale entries.\n`))
  }
}
