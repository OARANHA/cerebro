import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

export async function serve(options: { port: string }) {
  const port = options.port ?? '7700'
  const serverPath = join(__dirname, '../../../serve/dist/index.js')

  console.log(`🧠 Starting Cerebro dashboard on http://localhost:${port}...\n`)

  const proc = spawn('node', [serverPath], {
    env: { ...process.env, PORT: port },
    stdio: 'inherit',
  })

  proc.on('error', err => {
    console.error('Failed to start server:', err.message)
    console.log('Run `cerebro build` first or use `cd packages/serve && npm run dev`')
  })
}
