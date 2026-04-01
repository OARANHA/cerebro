import { homedir } from 'os'
import { join, normalize, sep } from 'path'
import { readdirSync, existsSync } from 'fs'

/**
 * Returns the base memory dir — mirrors Claude Code's getMemoryBaseDir()
 * Respects CLAUDE_CODE_REMOTE_MEMORY_DIR env override.
 */
export function getMemoryBaseDir(): string {
  return process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR ?? join(homedir(), '.claude')
}

/**
 * Returns all project memory directories found under ~/.claude/projects/
 * Each directory contains a MEMORY.md and optionally logs/
 */
export function getAllProjectMemoryDirs(): string[] {
  const projectsDir = join(getMemoryBaseDir(), 'projects')
  if (!existsSync(projectsDir)) return []

  try {
    return readdirSync(projectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => join(projectsDir, d.name, 'memory'))
      .filter(d => existsSync(d))
  } catch {
    return []
  }
}

/**
 * Returns the MEMORY.md path for a given project memory dir
 */
export function getMemoryEntrypoint(memDir: string): string {
  return join(memDir, 'MEMORY.md')
}

/**
 * Returns all daily log files under memory/logs/YYYY/MM/
 */
export function getLogFiles(memDir: string): string[] {
  const logsDir = join(memDir, 'logs')
  if (!existsSync(logsDir)) return []

  const files: string[] = []
  try {
    const years = readdirSync(logsDir)
    for (const year of years) {
      const months = readdirSync(join(logsDir, year))
      for (const month of months) {
        const dayFiles = readdirSync(join(logsDir, year, month))
        for (const f of dayFiles) {
          if (f.endsWith('.md')) {
            files.push(join(logsDir, year, month, f))
          }
        }
      }
    }
  } catch { /* empty dirs are ok */ }
  return files
}

/**
 * Extracts a human-readable project name from the sanitized path
 * e.g. "-home-user-projects-my-app" → "my-app"
 */
export function projectNameFromDir(memDir: string): string {
  const parts = memDir.split(sep)
  const projectKey = parts[parts.length - 2] ?? memDir
  const segments = projectKey.split('-').filter(Boolean)
  return segments.slice(-3).join('-') || projectKey
}
