import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { id } = { id: 'unknown' } // placeholder
  return NextResponse.json({ ok: true, id })
} 