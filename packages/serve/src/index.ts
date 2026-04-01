import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  getAllProjectMemoryDirs,
  getMemoryEntrypoint,
  getLogFiles,
  projectNameFromDir,
  parseMemoryFile,
  parseLogFile,
  scoreAllEntries,
  watchMemoryFiles,
} from '@cerebro/core'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
app.use(cors())
app.use(express.json())

// Serve built dashboard
app.use(express.static(join(__dirname, '../../apps/dashboard/dist')))

// ─── API Routes ─────────────────────────────────────────────────────────────

/** GET /api/projects — list all Claude Code projects with memory */
app.get('/api/projects', (_req, res) => {
  const dirs = getAllProjectMemoryDirs()
  const projects = dirs.map(dir => ({
    id: Buffer.from(dir).toString('base64'),
    name: projectNameFromDir(dir),
    dir,
    memoryFile: getMemoryEntrypoint(dir),
    logCount: getLogFiles(dir).length,
  }))
  res.json(projects)
})

/** GET /api/memories/:projectId — entries with RFM scores */
app.get('/api/memories/:projectId', (req, res) => {
  const dir = Buffer.from(req.params.projectId, 'base64').toString()
  const memFile = getMemoryEntrypoint(dir)
  const entries = parseMemoryFile(memFile)

  const logFiles = getLogFiles(dir)
  const logContents = logFiles.map(f => parseLogFile(f).content)

  const scores = scoreAllEntries(entries, logContents)

  const result = entries.map(e => ({
    ...e,
    rfm: scores.get(e.id),
  }))

  res.json(result)
})

/** GET /api/logs/:projectId — recent log events */
app.get('/api/logs/:projectId', (req, res) => {
  const dir = Buffer.from(req.params.projectId, 'base64').toString()
  const logFiles = getLogFiles(dir).slice(-30) // last 30 days
  const logs = logFiles.map(f => parseLogFile(f))
  res.json(logs)
})

/** GET /api/gc/:projectId — memories at risk */
app.get('/api/gc/:projectId', (req, res) => {
  const dir = Buffer.from(req.params.projectId, 'base64').toString()
  const threshold = Number(req.query.threshold ?? 7)
  const entries = parseMemoryFile(getMemoryEntrypoint(dir))
  const logContents = getLogFiles(dir).map(f => parseLogFile(f).content)
  const scores = scoreAllEntries(entries, logContents)

  const atRisk = entries
    .filter(e => (e.ageDays >= threshold) || scores.get(e.id)?.riskOfGC)
    .map(e => ({ ...e, rfm: scores.get(e.id) }))

  res.json(atRisk)
})

// ─── WebSocket — live updates ────────────────────────────────────────────────

const server = createServer(app)
const wss = new WebSocketServer({ server })

const stopWatcher = watchMemoryFiles(event => {
  const payload = JSON.stringify(event)
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload)
  })
})

const PORT = Number(process.env.PORT ?? 7700)
server.listen(PORT, () => {
  console.log(`🧠 Cerebro dashboard → http://localhost:${PORT}`)
})

process.on('SIGTERM', () => { stopWatcher(); process.exit(0) })
