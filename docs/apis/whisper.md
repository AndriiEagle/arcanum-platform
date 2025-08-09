# Whisper API (speech-to-text)

Endpoint: `POST /api/whisper`

Формат: multipart/form-data, поле `audio` (File)

Ответ 200:
```json
{ "transcription": "...", "duration": 12, "model": "whisper-1", "language": "ru" }
```

GET `/api/whisper` — состояние сервиса.

Пример curl:
```bash
curl -X POST $BASE/api/whisper \
  -H 'Authorization: Bearer <token>' \
  -F 'audio=@/path/to/sample.wav'
```