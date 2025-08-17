export type SphereCode = 'S1'|'S2'|'S3'|'S4'|'S5'|'S6'|'S7'|'S8'|'S9'

export const SPHERE_CODE_TO_NAME: Record<SphereCode, string> = {
  S1: 'S1 — Vitality (Тело/Реактор)',
  S2: 'S2 — Mind/Code (Разум/Код)',
  S3: 'S3 — Habitat (Среда/Кокон)',
  S4: 'S4 — Action/Vector (Действие/Вектор)',
  S5: 'S5 — Communication/Influence (Связи/Коммуникация/Влияние)',
  S6: 'S6 — Craft/Production (Производство/Крафт)',
  S7: 'S7 — Status/Discipline (Статус/Дисциплина)',
  S8: 'S8 — Network/Library (Сеть/Библиотека)',
  S9: 'S9 — Capital/Resources (Ресурсы/Капитал)'
}

export const SPHERE_CODE_TO_ICON: Record<SphereCode, string> = {
  S1: '💪',
  S2: '🧠',
  S3: '🏠',
  S4: '⚡',
  S5: '📣',
  S6: '🛠️',
  S7: '🏆',
  S8: '📚',
  S9: '💰'
}

export function getDisplayNameForCode(code?: string | null): string {
  const c = (code || '') as SphereCode
  return (SPHERE_CODE_TO_NAME as any)[c] || code || 'Unknown Sphere'
}

export function getIconForCode(code?: string | null): string {
  const c = (code || '') as SphereCode
  return (SPHERE_CODE_TO_ICON as any)[c] || '🌀'
} 