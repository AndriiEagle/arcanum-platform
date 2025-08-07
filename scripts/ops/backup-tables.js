#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
// Load env from local files if present
try {
  const dotenv = require('dotenv')
  const envLocal = path.resolve(process.cwd(), 'arcanum-platform', '.env.local')
  const envRoot = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envLocal)) dotenv.config({ path: envLocal })
  if (fs.existsSync(envRoot)) dotenv.config({ path: envRoot })
} catch (_) {}

const { createClient } = require('@supabase/supabase-js')

const REQUIRED_ENV = ['SUPABASE_URL']

function parseArgs() {
  const args = process.argv.slice(2)
  const outArg = args.find(a => a.startsWith('--out='))
  const outDir = outArg ? outArg.split('=')[1] : 'arcanum-platform/backups/json'
  return { outDir }
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function envOrThrow(name, altNames = []) {
  for (const key of [name, ...altNames]) {
    const v = process.env[key]
    if (v && v.trim().length > 0) return v
  }
  throw new Error(`Missing required env: ${name} (or ${altNames.join(', ')})`)
}

async function dumpTable(supabase, tableName, outDir) {
  console.log(`Dumping ${tableName} ...`)
  const { data, error } = await supabase.from(tableName).select('*')
  if (error) throw new Error(`Failed to fetch ${tableName}: ${error.message}`)
  const file = path.join(outDir, `${tableName}.json`)
  fs.writeFileSync(file, JSON.stringify(data || [], null, 2), 'utf-8')
}

async function main() {
  const { outDir } = parseArgs()
  ensureDir(outDir)

  const url = envOrThrow('SUPABASE_URL')
  const key = envOrThrow('SUPABASE_SERVICE_ROLE_KEY', ['SUPABASE_SERVICE_KEY'])
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Minimal critical tables for Arcanum
  const tables = [
    'ui_layouts',
    'life_spheres',
    'user_stats',
    'user_tasks',
    'sphere_categories',
    'generated_mascots',
    'user_buffs',
    'ai_model_usage',
    'scheduled_rewards',
    'scheduled_events',
    'user_integrations'
  ]

  for (const t of tables) {
    try { await dumpTable(supabase, t, outDir) } 
    catch (e) { console.warn(`Warn: ${t} skipped: ${e.message}`) }
  }

  console.log(`Backup JSON exported to ${outDir}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
}) 