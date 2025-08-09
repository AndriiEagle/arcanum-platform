import { createServerClient } from '../supabase/server'

export type ScheduledEventType = 'image' | 'video' | 'audio' | 'mascots' | 'text'

export interface ScheduledEvent {
  id: string
  user_id: string
  title: string
  event_type: ScheduledEventType
  payload: Record<string, unknown>
  scheduled_at: string
  status: 'scheduled' | 'fired' | 'canceled'
  created_at: string
  updated_at: string
}

export async function createEvent(userId: string, title: string, eventType: ScheduledEventType, scheduledAtISO: string, payload: Record<string, unknown>) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('scheduled_events')
    .insert({ user_id: userId, title, event_type: eventType, scheduled_at: scheduledAtISO, payload })
    .select()
    .single()
  if (error) throw error
  return data as ScheduledEvent
}

export async function listEvents(userId: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .eq('user_id', userId)
    .order('scheduled_at', { ascending: true })
  if (error) throw error
  return (data || []) as ScheduledEvent[]
}

export async function cancelEvent(userId: string, id: string) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('scheduled_events')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getDueEvents(nowISO: string) {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('scheduled_events')
    .select('*')
    .eq('status', 'scheduled')
    .lte('scheduled_at', nowISO)
  if (error) throw error
  return (data || []) as ScheduledEvent[]
}

export async function markFired(userId: string, id: string) {
  const supabase = createServerClient()
  const { error } = await supabase
    .from('scheduled_events')
    .update({ status: 'fired', updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', userId)
  if (error) throw error
} 