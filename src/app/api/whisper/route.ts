import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'Audio file is required' }, { status: 400 })
    }

    console.log('🎤 Whisper transcribing audio:', audioFile.name, audioFile.size, 'bytes')

    // Отправляем аудио в Whisper для транскрибации
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'ru', // Указываем русский язык для лучшего распознавания
      prompt: 'Пользователь говорит о своих навыках, задачах, целях или хочет обновить данные в Arcanum Platform.',
      temperature: 0.2
    })

    const transcribedText = transcription.text

    console.log('✅ Whisper transcription result:', transcribedText)

    return NextResponse.json({ 
      transcription: transcribedText,
      duration: audioFile.size > 0 ? Math.round(audioFile.size / 16000) : 0, // Примерная длительность
      model: 'whisper-1',
      language: 'ru'
    })

  } catch (error) {
    console.error('❌ Whisper transcription error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({
      error: `Ошибка транскрибации: ${errorMessage}`
    }, { status: 500 })
  }
}

// GET метод для тестирования
export async function GET() {
  return NextResponse.json({ 
    message: 'Arcanum Whisper API',
    status: 'active',
    model: 'whisper-1',
    supported_formats: ['mp3', 'wav', 'webm', 'm4a', 'ogg'],
    max_file_size: '25MB',
    hasApiKey: !!process.env.OPENAI_API_KEY
  })
} 