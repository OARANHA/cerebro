import type { MemoryEntry } from './parser.js'

export interface RFMScore {
  recency: number   // 0–100: how recently was this memory touched
  frequency: number // 0–100: how often does it appear in logs (references)
  monetary: number  // 0–100: how many other memories depend on this one
  total: number     // weighted average
  riskOfGC: boolean // true when total < GC_THRESHOLD
}

const GC_THRESHOLD = 35
const MAX_AGE_DAYS = 90 // anything older → recency = 0

/**
 * Calculates RFM score for a memory entry.
 * - Recency: linear decay over MAX_AGE_DAYS
 * - Frequency: how many log events reference this entry's id or title
 * - Monetary: count of relatedTo links pointing TO this memory
 */
export function calculateRFM(
  entry: MemoryEntry,
  allEntries: MemoryEntry[],
  logContents: string[],
): RFMScore {
  // Recency (0–100)
  const recency = Math.max(0, 100 - (entry.ageDays / MAX_AGE_DAYS) * 100)

  // Frequency: count references in log files
  const title = entry.id.split('::').pop() ?? ''
  const refCount = logContents.filter(log =>
    log.includes(title) || log.includes(entry.id)
  ).length
  const frequency = Math.min(100, refCount * 20) // 5 references = 100

  // Monetary: how many other entries link to this one
  const incomingLinks = allEntries.filter(e =>
    e.relatedTo.some(r => r.includes(title))
  ).length
  const monetary = Math.min(100, incomingLinks * 25) // 4 links = 100

  const total = Math.round(recency * 0.5 + frequency * 0.3 + monetary * 0.2)

  return {
    recency: Math.round(recency),
    frequency: Math.round(frequency),
    monetary: Math.round(monetary),
    total,
    riskOfGC: total < GC_THRESHOLD,
  }
}

export function scoreAllEntries(
  entries: MemoryEntry[],
  logContents: string[],
): Map<string, RFMScore> {
  const map = new Map<string, RFMScore>()
  for (const entry of entries) {
    map.set(entry.id, calculateRFM(entry, entries, logContents))
  }
  return map
}
