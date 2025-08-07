import { createClient } from '../supabase/client'

export interface UserCustomizationConfig {
  avatarUrl?: string
  sphereIcons?: Record<string, string>
  mascots?: {
    successUrl?: string
    punishmentUrl?: string
    warningUrl?: string
  }
  telegram?: {
    enabled?: boolean
    friendChatId?: string
    friendName?: string
  }
}

const supabase = createClient()

export async function getCustomization(userId: string): Promise<UserCustomizationConfig> {
  const { data, error } = await supabase
    .from('ui_layouts')
    .select('id, layout_config')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.warn('getCustomization error:', error)
    return {}
  }

  const cfg = (data?.layout_config as UserCustomizationConfig) || {}
  return cfg
}

async function upsertCustomization(userId: string, patch: Partial<UserCustomizationConfig>): Promise<UserCustomizationConfig> {
  const current = await getCustomization(userId)
  const next: UserCustomizationConfig = {
    ...current,
    ...patch,
    sphereIcons: { ...(current.sphereIcons || {}), ...(patch.sphereIcons || {}) },
    mascots: { ...(current.mascots || {}), ...(patch.mascots || {}) },
    telegram: { ...(current.telegram || {}), ...(patch.telegram || {}) }
  }

  const { data: existing } = await supabase
    .from('ui_layouts')
    .select('id')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('ui_layouts')
      .update({ layout_config: next, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .eq('user_id', userId)
    if (error) throw error
  } else {
    const { error } = await supabase
      .from('ui_layouts')
      .insert({ user_id: userId, layout_config: next })
    if (error) throw error
  }

  return next
}

export async function setAvatarUrl(userId: string, avatarUrl: string) {
  return upsertCustomization(userId, { avatarUrl })
}

export async function setSphereIcon(userId: string, sphereId: string, iconUrl: string) {
  return upsertCustomization(userId, { sphereIcons: { [sphereId]: iconUrl } })
}

export async function setMascot(userId: string, type: 'successUrl' | 'punishmentUrl' | 'warningUrl', url: string) {
  return upsertCustomization(userId, { mascots: { [type]: url } as any })
}

export async function setTelegramEnabled(userId: string, enabled: boolean) {
  return upsertCustomization(userId, { telegram: { enabled } })
}

export async function setTelegramFriend(userId: string, friendChatId: string, friendName?: string) {
  return upsertCustomization(userId, { telegram: { friendChatId, friendName } })
}

export async function getAvatarUrl(userId: string) {
  const cfg = await getCustomization(userId)
  return cfg.avatarUrl
}

export async function getSphereIcons(userId: string) {
  const cfg = await getCustomization(userId)
  return cfg.sphereIcons || {}
}

export async function getMascots(userId: string) {
  const cfg = await getCustomization(userId)
  return cfg.mascots || {}
}

export async function getTelegramSettings(userId: string) {
  const cfg = await getCustomization(userId)
  return cfg.telegram || {}
} 