# Chat API

Endpoint: `POST /api/chat`

Тело запроса:
```json
{
  "message": "строка",
  "userId": "uuid",
  "modelId": "gpt-4o-mini" // опционально
}
```

Коды ответов:
- 200 OK — успешный ответ
- 401 AUTH_REQUIRED — требуется вход
- 402 TOKEN_LIMIT — лимит токенов (с данными paywall)
- 500 — ошибка сервера

Пример ответа 200:
```json
{
  "response": "Текст MOYO",
  "commandType": "general_chat",
  "modelUsed": "gpt-4o-mini",
  "tokensUsed": 123
}
```

Пример curl:
```bash
curl -X POST $BASE/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"message":"Привет!","userId":"<USER_ID>","modelId":"gpt-4o-mini"}'
```