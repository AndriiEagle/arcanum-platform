import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ ok: true, tasks: [] })
}

export async function POST(req: NextRequest) {
  const _ = await req.json().catch(() => ({}))
  return NextResponse.json({ ok: true })
} 