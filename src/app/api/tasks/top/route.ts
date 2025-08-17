import { NextRequest, NextResponse } from 'next/server'
import { topTasks } from '../../../../../lib/services/resonanceService'

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const userId = url.searchParams.get('userId') || ''
    const n = Math.max(1, Math.min(20, Number(url.searchParams.get('n') || 5)))
    
    if (!userId) {
      return NextResponse.json({ items: [] })
    }

    // 🚀 ИСПРАВЛЕНИЕ: Graceful handling для отсутствующих данных
    const items = await topTasks(userId, n)
    
    return NextResponse.json({ 
      items: items || [],
      count: items?.length || 0,
      userId: userId
    })
    
  } catch (error: any) {
    console.error('[API][tasks/top] Error:', error.message, {
      userId: new URL(req.url).searchParams.get('userId'),
      stack: error.stack
    })
    
    // 🚀 ИСПРАВЛЕНИЕ: Возвращаем пустой массив вместо 500 ошибки
    return NextResponse.json({ 
      items: [], 
      count: 0,
      error: error?.message || 'unknown',
      fallback: true 
    }, { status: 200 }) // Возвращаем 200 вместо 500
  }
} 