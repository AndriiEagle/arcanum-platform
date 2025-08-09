# Resonance API

Весовые коэффициенты сфер (S1..S9):

- `GET /api/resonance/weights`
  - Headers: `x-user-id: <uuid>`
  - Ответ: `{ ok: true, items: [{ sphere_a, sphere_b, weight }] }`

- `POST /api/resonance/weights`
  - Headers: `x-user-id: <uuid>` (или поле `user_id` в теле)
  - Тело: `{ sphere_a: 'S1', sphere_b: 'S5', weight: 0.7 }`
  - Валидно: `weight ∈ [0,1]` — симметрично апсертом сохраняется пара (A,B) и (B,A)

Top‑tasks (скоринг на основе резонанса):

- `GET /api/tasks/top?n=3`
  - Headers: `x-user-id: <uuid>`
  - Ответ: `{ ok: true, items: [{ id, score }] }`

Внутренняя логика скоринга: `lib/services/resonanceService.ts` (`calcScoreInternal`, `topTasks`).