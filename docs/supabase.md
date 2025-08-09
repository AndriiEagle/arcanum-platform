# Supabase клиенты

Доступны два хелпера для создания клиентов Supabase.

- `lib/supabase/client.ts`

```ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

Использование (клиент/браузер):

```ts
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()
const { data, error } = await supabase.from('table').select('*')
```

- `lib/supabase/server.ts`

```ts
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const key = (process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) as string
  if (!url || !key) throw new Error('Supabase env vars are not configured')
  return createSupabaseClient(url, key)
}
```

Использование (на сервере, в API‑роутах):

```ts
import { createServerClient } from '@/lib/supabase/server'
const supabase = createServerClient()
```

Требуемые ENV: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, опционально `SUPABASE_SERVICE_KEY`.