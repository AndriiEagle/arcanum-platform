# Image Generation API

Endpoint: `POST /api/generate-header`

Тело запроса:
```json
{ "prompt": "Описание изображения" }
```

Ответ 200:
```json
{ "imageUrl": "https://...", "prompt": "...", "generatedAt": "ISO" }
```

Ошибки: 400 (нет prompt), 500 (нет ключа OpenAI или сбой)

Пример curl:
```bash
curl -X POST $BASE/api/generate-header \
  -H 'Content-Type: application/json' \
  -d '{"prompt":"Эпический цифровой арт..."}'
```