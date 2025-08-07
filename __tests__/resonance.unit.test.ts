import assert from 'assert'
import { calcScoreInternal } from '../lib/services/resonanceService'

function w(a: string, b: string, v: number, acc: any) {
  acc[a] = acc[a] || {}; acc[a][b] = v; return acc
}

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
  console.log('\n🧪 Resonance Unit Tests')

  await run('returns 0 when purpose_score < 0.5', () => {
    const weights = {} as any
    const task: any = {
      expected_effect: { S1: 0.8 },
      effort: 2,
      purpose_score: 0.4
    }
    assert.strictEqual(calcScoreInternal(task, weights), 0)
  })

  await run('basic scoring with single sphere and effort', () => {
    const weights = {} as any
    const task: any = {
      expected_effect: { S1: 1.0 },
      effort: 2,
      purpose_score: 1.0
    }
    const score = calcScoreInternal(task, weights)
    // sum=1, domino=1+0.2*1=1.2 => 1*1.2*1 / 2 = 0.6
    assert.ok(Math.abs(score - 0.6) < 1e-6)
  })

  await run('domino bonus increases with multiple unique spheres', () => {
    const weights = {} as any
    const task: any = {
      expected_effect: { S1: 0.5, S2: 0.5 },
      effort: 2,
      purpose_score: 1.0
    }
    const score = calcScoreInternal(task, weights)
    // sum=1; domino=1+0.2*2=1.4; score=1*1.4/2=0.7
    assert.ok(Math.abs(score - 0.7) < 1e-6)
  })

  await run('uses symmetric max weight between spheres (<=1 baseline keeps 1)', () => {
    let weights: any = {}
    weights = w('S1','S2',0.8,weights)
    const task: any = {
      expected_effect: { S1: 0.5, S2: 0.5 },
      effort: 1,
      purpose_score: 1.0
    }
    const score = calcScoreInternal(task, weights)
    // w max is 1 baseline; score = 1 (sum)*1.4(domino)/1 = 1.4
    assert.ok(Math.abs(score - 1.4) < 1e-6)

    // symmetric strong link still capped by baseline 1
    weights = {}
    weights = w('S1','S3',0.9,weights)
    weights = w('S3','S1',0.9,weights)
    const score2 = calcScoreInternal({ expected_effect: { S1: 0.5, S3: 0.5 }, effort: 1, purpose_score: 1 } as any, weights)
    assert.ok(Math.abs(score2 - 1.4) < 1e-6)
  })

  await run('effort reduces score', () => {
    const weights = {} as any
    const tLow: any = { expected_effect: { S1: 1 }, effort: 1, purpose_score: 1 }
    const tHigh: any = { expected_effect: { S1: 1 }, effort: 4, purpose_score: 1 }
    assert.ok(calcScoreInternal(tLow, weights) > calcScoreInternal(tHigh, weights))
  })

  console.log('🏁 Resonance unit tests finished')
})() 