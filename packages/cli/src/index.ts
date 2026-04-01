#!/usr/bin/env node
import { Command } from 'commander'
import { remember } from './commands/remember.js'
import { gc } from './commands/gc.js'
import { serve } from './commands/serve.js'

const program = new Command()

program
  .name('cerebro')
  .description('🧠 Second brain for Claude Code')
  .version('0.1.0')

program
  .command('remember')
  .description('Review auto-memory and propose promotions to CLAUDE.md / CLAUDE.local.md')
  .option('--apply', 'Apply approved promotions without confirmation')
  .option('--project <path>', 'Target specific project path')
  .action(remember)

program
  .command('gc')
  .description('Garbage collect stale memories')
  .option('--threshold <days>', 'Age threshold in days', '7')
  .option('--apply', 'Actually delete stale memories')
  .option('--project <path>', 'Target specific project path')
  .action(gc)

program
  .command('serve')
  .description('Start the memory dashboard')
  .option('--port <port>', 'Port to listen on', '7700')
  .action(serve)

program.parse()
