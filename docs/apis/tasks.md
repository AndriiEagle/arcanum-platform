# Tasks API

- `POST /api/tasks`
  - Headers: `x-user-id: <uuid>` (или в теле `user_id`)
  - Тело (основные поля):
    ```json
    {
      "title": "string",
      "description": "string?",
      "primary_sphere": "S1..S9?",
      "secondary_spheres": ["Sx"...],
      "expected_effect": { "S1": 0..1, ... },
      "effort": 0.5..5,
      "purpose_score": 0..1,
      "due_date": "ISO?"
    }
    ```
  - Ответ: `{ ok: true, id: "..." }`

- `GET /api/tasks/top?n=3`
  - Headers: `x-user-id: <uuid>`
  - Ответ: `{ ok: true, items: [{ id, score }] }`

- `POST /api/tasks/[id]/score/recalc`
  - Headers: `x-user-id: <uuid>`
  - Ответ: `{ ok: true, id, score }`

Валидация ключей `expected_effect`: только `S1..S9`, значения в `[0,1]`.