export function getResonanceEnabledServer(): boolean {
  const val = process.env.RESONANCE_ENABLED
  if (typeof val !== 'string') return false
  return val.toLowerCase() === 'true' || val === '1'
}

export function getResonanceEnabledClient(): boolean {
  if (typeof window === 'undefined') return false
  const val = process.env.NEXT_PUBLIC_RESONANCE_ENABLED as unknown as string | undefined
  if (typeof val !== 'string') return false
  return val.toLowerCase() === 'true' || val === '1'
}

export function isResonanceEnabled(): boolean {
  // Enabled if either server or client flag is turned on
  return getResonanceEnabledServer() || getResonanceEnabledClient()
} 