import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    
    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    console.log('Generating image with prompt:', prompt)

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
      style: "vivid"
    })

    const imageUrl = response.data[0]?.url

    if (!imageUrl) {
      return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 })
    }

    return NextResponse.json({ 
      imageUrl,
      prompt,
      generatedAt: new Date().toISOString()
    })

  } catch (error: unknown) {
    console.error('Error generating image:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return NextResponse.json({ 
      error: `Failed to generate image: ${errorMessage}` 
    }, { status: 500 })
  }
}

// GET метод для тестирования
export async function GET() {
  return NextResponse.json({ 
    message: 'Header Image Generator API',
    status: 'active',
    hasApiKey: !!process.env.OPENAI_API_KEY
  })
} 