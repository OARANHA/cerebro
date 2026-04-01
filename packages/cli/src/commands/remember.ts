import chalk from 'chalk'
import {
  getAllProjectMemoryDirs,
  getMemoryEntrypoint,
  getLogFiles,
  parseMemoryFile,
  parseLogFile,
  scoreAllEntries,
  projectNameFromDir,
} from '@cerebro/core'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Replicates the internal /remember skill from Claude Code.
 * Available only for USER_TYPE=ant internally — we open it for everyone.
 */
export async function remember(options: { apply?: boolean; project?: string }) {
  console.log(chalk.bold.cyan('\n🧠 Cerebro Remember\n'))

  const dirs = options.project
    ? [join(options.project, 'memory')]
    : getAllProjectMemoryDirs()

  if (dirs.length === 0) {
    console.log(chalk.yellow('No Claude Code memory directories found.'))
    console.log(chalk.dim('Make sure you have used Claude Code in at least one project.'))
    return
  }

  for (const dir of dirs) {
    const projectName = projectNameFromDir(dir)
    console.log(chalk.bold(`📁 Project: ${projectName}`))
    console.log(chalk.dim(`   Path: ${dir}\n`))

    const memFile = getMemoryEntrypoint(dir)
    const entries = parseMemoryFile(memFile)

    if (entries.length === 0) {
      console.log(chalk.dim('  No auto-memory entries found.\n'))
      continue
    }

    const logContents = getLogFiles(dir).map(f => parseLogFile(f).content)
    const scores = scoreAllEntries(entries, logContents)

    // Check if CLAUDE.md and CLAUDE.local.md exist
    const projectRoot = dir.replace(/[\/\\]memory[\/\\]?$/, '')
    const claudeMdExists = existsSync(join(projectRoot, 'CLAUDE.md'))
    const claudeLocalExists = existsSync(join(projectRoot, 'CLAUDE.local.md'))

    console.log(chalk.bold('  📋 Promotions proposed:'))
    console.log(chalk.dim('  (These entries look stable enough to move out of auto-memory)\n'))

    let promotions = 0
    for (const entry of entries) {
      const score = scores.get(entry.id)
      if (!score) continue

      // High-value entries (high frequency, not at risk) → promote to CLAUDE.md
      if (score.frequency >= 60 && score.total >= 60) {
        console.log(chalk.green(`  ✦ PROMOTE → CLAUDE.md`))
        console.log(chalk.white(`    "${entry.content.slice(0, 80).trim()}..."`))
        console.log(chalk.dim(`    Score: R${score.recency} F${score.frequency} M${score.monetary} | Total: ${score.total}`))
        console.log()
        promotions++
      }

      // Personal preference patterns → CLAUDE.local.md
      if (entry.content.match(/\b(I prefer|always|never|don't|personal)\b/i) && score.total >= 40) {
        console.log(chalk.blue(`  ✦ PROMOTE → CLAUDE.local.md`))
        console.log(chalk.white(`    "${entry.content.slice(0, 80).trim()}..."`))
        console.log(chalk.dim(`    Score: R${score.recency} F${score.frequency} M${score.monetary} | Total: ${score.total}`))
        console.log()
        promotions++
      }
    }

    if (promotions === 0) {
      console.log(chalk.dim('  No promotions needed at this time.\n'))
    }

    // GC risks
    const atRisk = entries.filter(e => scores.get(e.id)?.riskOfGC)
    if (atRisk.length > 0) {
      console.log(chalk.bold(chalk.red(`  ⚠ At risk of GC (${atRisk.length} entries):`)))
      for (const e of atRisk) {
        const score = scores.get(e.id)!
        console.log(chalk.red(`    - ${e.content.slice(0, 60).trim()}`))
        console.log(chalk.dim(`      Score: ${score.total} | Age: ${e.ageDays}d`))
      }
      console.log()
    }

    if (!claudeMdExists) {
      console.log(chalk.yellow('  ℹ No CLAUDE.md found — run: touch CLAUDE.md'))
    }
    if (!claudeLocalExists) {
      console.log(chalk.yellow('  ℹ No CLAUDE.local.md found — run: touch CLAUDE.local.md'))
    }
  }

  console.log(chalk.dim('\nRun with --apply to apply promotions automatically.\n'))
}
