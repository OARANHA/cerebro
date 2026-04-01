import chokidar from 'chokidar'
import { join } from 'path'
import { getMemoryBaseDir } from './paths.js'

export type WatchEvent = {
  type: 'add' | 'change' | 'unlink'
  path: string
}

/**
 * Watches all Claude Code memory files for changes.
 * Emits events whenever MEMORY.md or log files are updated.
 */
export function watchMemoryFiles(
  onChange: (event: WatchEvent) => void
): () => void {
  const glob = join(getMemoryBaseDir(), 'projects', '**', '*.md')

  const watcher = chokidar.watch(glob, {
    ignoreInitial: false,
    persistent: true,
  })

  watcher
    .on('add', path => onChange({ type: 'add', path }))
    .on('change', path => onChange({ type: 'change', path }))
    .on('unlink', path => onChange({ type: 'unlink', path }))

  return () => watcher.close()
}
