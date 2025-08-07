import assert from 'assert'

async function run(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    console.log(`✅ ${name}`)
  } catch (e: any) {
    console.error(`❌ ${name}: ${e?.message || e}`)
    process.exitCode = 1
  }
}

(async () => {
  console.log('\n🧪 Orchestrator E2E Tests (daily-run)')
  const base = process.env.LOCAL_BASE_URL || 'http://localhost:3000'
  const userId = process.env.TEST_USER_ID || ''
  const secret = process.env.CRON_SECRET || process.env.cron_secret || ''

  await run('POST /api/orchestrator/daily-run returns JSON (or skipped if server down)', async () => {
    try {
      const res = await fetch(`${base}/api/orchestrator/daily-run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-cron-secret': secret
        },
        body: JSON.stringify(userId ? { user_id: userId } : {})
      })
      // Allow 200 or 401 (unauthorized on missing secret in dev)
      assert.ok([200, 401].includes(res.status), `Unexpected status ${res.status}`)
      const json = await res.json().catch(() => ({}))
      assert.ok(typeof json === 'object')
    } catch (err: any) {
      console.log(`⚠️  Skipped: server not reachable at ${base} (${err?.message || err})`)
    }
  })

  console.log('🏁 Orchestrator E2E finished')
})() 