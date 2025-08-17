import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { to, subject, html } = await req.json()
    if (!to || !subject || !html) return NextResponse.json({ ok: false, error: 'Missing fields' }, { status: 400 })
    console.log('Email send stub:', { to, subject })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 