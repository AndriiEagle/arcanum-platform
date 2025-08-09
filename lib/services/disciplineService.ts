import { createServerClient } from '../supabase/server'
import { getMascots, getTelegramSettings } from './customizationService'

export interface TaskDeclaration {
  id: string
  user_id: string
  sphere_id: string | null
  task_id?: string | null
  title: string
  due_at: string // ISO
  created_at: string
  status: 'declared' | 'completed' | 'missed'
  completed_at?: string | null
  processed?: boolean
}

export interface DisciplineEvent {
  id: string
  user_id: string
  declaration_id?: string | null
  type: 'reward' | 'penalty'
  delta_xp: number
  level_before: number
  level_after: number
  details: string
  mascot_url?: string | null
  created_at: string
}

export async function declareTask(userId: string, sphereId: string | null, title: string, dueAtISO: string, taskId?: string | null) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('task_declarations')
    .insert({ user_id: userId, sphere_id: sphereId, task_id: taskId ?? null, title, due_at: dueAtISO, status: 'declared' })
    .select()
    .single()
  if (error) throw error
  return data as TaskDeclaration
}

export async function markDeclarationCompleted(userId: string, declarationId: string) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('task_declarations')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', declarationId)
    .eq('user_id', userId)
  if (error) throw error
}

function computeLevelFromXP(xp: number) {
  return Math.max(1, Math.floor(xp / 1000) + 1)
}

async function sendEmail(to: string | undefined, subject: string, html: string) {
  const base = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  if (!to) return
  await fetch(`${base}/api/notify/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, subject, html })
  })
}

export async function dailyReview(userId: string) {
  const supabase = createServerClient()
  const nowISO = new Date().toISOString()

  const { data: declarations, error } = await supabase
    .from('task_declarations')
    .select('*')
    .eq('user_id', userId)
    .eq('processed', false)
    .lte('due_at', nowISO)
  if (error) throw error

  if (!declarations || declarations.length === 0) return { processed: 0 }

  const { data: stats } = await supabase
    .from('user_stats')
    .select('current_xp, level')
    .eq('user_id', userId)
    .maybeSingle()

  let currentXP = stats?.current_xp || 0
  let level = stats?.level || 1

  const mascots = await getMascots(userId)
  const emailTo = process.env.ESCALATION_EMAIL_RECIPIENT || process.env.SMTP_USER

  let processed = 0
  for (const dec of declarations as TaskDeclaration[]) {
    processed++

    if (dec.status === 'completed') {
      const rewardXP = Math.max(25, Math.min(300, Math.round((dec.title.length || 10) * 3)))
      const levelBefore = level
      currentXP = currentXP + rewardXP
      level = computeLevelFromXP(currentXP)

      await supabase
        .from('user_stats')
        .update({ current_xp: currentXP, level })
        .eq('user_id', userId)

      const details = `Выполнено: ${dec.title}. +${rewardXP} XP.`
      const mascot_url = mascots.successUrl

      await supabase
        .from('discipline_events')
        .insert({
          user_id: userId,
          declaration_id: dec.id,
          type: 'reward',
          delta_xp: rewardXP,
          level_before: levelBefore,
          level_after: level,
          details,
          mascot_url
        })

      await sendEmail(emailTo, 'Discipline Report: Goal Completed', `<div style="font-family:sans-serif"><p>${details}</p>${mascot_url ? `<img src=\"${mascot_url}\" width=\"64\" height=\"64\"/>` : ''}</div>`)    
    } else if (dec.status === 'declared') {
      const penaltyXP = Math.max(10, Math.min(200, Math.round((dec.title.length || 10) * 2)))
      const levelBefore = level
      currentXP = Math.max(0, currentXP - penaltyXP)
      level = computeLevelFromXP(currentXP)

      await supabase
        .from('task_declarations')
        .update({ status: 'missed' })
        .eq('id', dec.id)
        .eq('user_id', userId)

      await supabase
        .from('user_stats')
        .update({ current_xp: currentXP, level })
        .eq('user_id', userId)

      const details = `Не выполнено: ${dec.title}. -${penaltyXP} XP.`
      const mascot_url = mascots.punishmentUrl

      await supabase
        .from('discipline_events')
        .insert({
          user_id: userId,
          declaration_id: dec.id,
          type: 'penalty',
          delta_xp: -penaltyXP,
          level_before: levelBefore,
          level_after: level,
          details,
          mascot_url
        })

      await sendEmail(emailTo, 'Discipline Report: Missed Task', `<div style=\"font-family:sans-serif\"><p>${details}</p>${mascot_url ? `<img src=\"${mascot_url}\" width=\"64\" height=\"64\"/>` : ''}</div>`)    

      const tg = await getTelegramSettings(userId)
      if (tg?.enabled && tg.friendChatId) {
        const base = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
        await fetch(`${base}/api/notify/telegram`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, message: details })
        })
      }
    }

    await supabase
      .from('task_declarations')
      .update({ processed: true })
      .eq('id', dec.id)
      .eq('user_id', userId)
  }

  return { processed }
} 