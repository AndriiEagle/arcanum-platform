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

function parseArgs() {
  const args = process.argv.slice(2)
  const mapArg = args.find(a => a.startsWith('--map='))
  const reportArg = args.find(a => a.startsWith('--report='))
  return {
    mapPath: mapArg ? mapArg.split('=')[1] : null,
    reportPath: reportArg ? reportArg.split('=')[1] : 'arcanum-platform/backups/map_12_to_9_report.json'
  }
}

function envOrThrow(name, alts=[]) {
  for (const key of [name, ...alts]) {
    const v = process.env[key]
    if (v && v.trim().length) return v
  }
  throw new Error(`Missing env: ${name}${alts.length?` or ${alts.join(', ')}`:''}`)
}

function loadMapping(mapPath) {
  if (!mapPath) return null
  if (!fs.existsSync(mapPath)) throw new Error(`Mapping file not found: ${mapPath}`)
  const raw = fs.readFileSync(mapPath, 'utf-8')
  return JSON.parse(raw)
}

function guessSCode(name) {
  const n = (name||'').toLowerCase()
  if (/(vital|тело|энерг|здоро|сон|гормон)/.test(n)) return 'S1'
  if (/(mind|разум|код|мышл|учеб|обуч|память|вниман|язык)/.test(n)) return 'S2'
  if (/(habitat|среда|дом|кокон|логист|рабоч|офис|стол|свет|звук)/.test(n)) return 'S3'
  if (/(action|действ|вектор|рутин|тренир|первым|start|sprint|помодор)/.test(n)) return 'S4'
  if (/(comm|коммуник|влия|связ|продаж|бренд|контент|соц)/.test(n)) return 'S5'
  if (/(craft|производ|крафт|код|продукт|доставка|релиз|feature|ship)/.test(n)) return 'S6'
  if (/(status|дисципл|воля|статус|режим|обещан|стрик)/.test(n)) return 'S7'
  if (/(network|сеть|library|библиотек|знани|архив|база|каталог)/.test(n)) return 'S8'
  if (/(capital|ресурс|капитал|финанс|деньг|актив|инструмент|инфра)/.test(n)) return 'S9'
  return 'S6'
}

async function main() {
  const { mapPath, reportPath } = parseArgs()
  const map = loadMapping(mapPath)
  const url = envOrThrow('SUPABASE_URL')
  const key = envOrThrow('SUPABASE_SERVICE_ROLE_KEY', ['SUPABASE_SERVICE_KEY'])
  const supabase = createClient(url, key, { auth: { persistSession: false } })

  // Load spheres
  const { data: spheres, error: sphErr } = await supabase
    .from('life_spheres')
    .select('id,user_id,sphere_name,sphere_code')
  if (sphErr) throw new Error(`life_spheres fetch error: ${sphErr.message}`)

  const legacyById = new Map()
  const newByUserCode = new Map()

  for (const s of spheres || []) {
    if (!s.sphere_code) {
      legacyById.set(s.id, { user_id: s.user_id, name: s.sphere_name })
    } else {
      if (!newByUserCode.has(s.user_id)) newByUserCode.set(s.user_id, new Map())
      newByUserCode.get(s.user_id).set(s.sphere_code, s.id)
    }
  }

  const legacyIds = Array.from(legacyById.keys())
  console.log(`Legacy spheres: ${legacyIds.length}, Users with new spheres: ${newByUserCode.size}`)
  if (legacyIds.length === 0) {
    console.log('No legacy spheres found. Nothing to map.')
    return
  }

  const report = { updated: 0, skipped: 0, missingNewTarget: 0, unmapped: [], details: [] }

  function resolveCodeForName(name) {
    if (map && map[name]) return map[name]
    return guessSCode(name)
  }

  const chunkSize = 100
  for (let i = 0; i < legacyIds.length; i += chunkSize) {
    const chunk = legacyIds.slice(i, i + chunkSize)
    const { data: tasks, error: tErr } = await supabase
      .from('user_tasks')
      .select('id,user_id,sphere_id')
      .in('sphere_id', chunk)
    if (tErr) throw new Error(`user_tasks fetch error: ${tErr.message}`)

    for (const task of tasks || []) {
      const legacy = legacyById.get(task.sphere_id)
      if (!legacy) { report.skipped++; continue }
      const code = resolveCodeForName(legacy.name)
      const mapForUser = newByUserCode.get(legacy.user_id)
      const newId = mapForUser ? mapForUser.get(code) : undefined
      if (!newId) {
        report.missingNewTarget++
        report.unmapped.push({ task_id: task.id, user_id: legacy.user_id, legacy_name: legacy.name, resolved_code: code })
        continue
      }
      const { error: upErr } = await supabase
        .from('user_tasks')
        .update({ sphere_id: newId })
        .eq('id', task.id)
      if (upErr) {
        report.skipped++
        report.details.push({ task_id: task.id, error: upErr.message })
      } else {
        report.updated++
      }
    }
  }

  const outDir = path.dirname(reportPath)
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`Done. Updated: ${report.updated}, Skipped: ${report.skipped}, MissingTargets: ${report.missingNewTarget}`)
  console.log(`Report: ${reportPath}`)
}

main().catch(err => {
  console.error('Mapping failed:', err)
  process.exit(1)
}) 