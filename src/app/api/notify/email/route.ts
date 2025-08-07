import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { to, subject, html } = body || {}
    if (!to || !subject || !html) {
      return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
    }

    const host = process.env.SMTP_HOST
    const port = Number(process.env.SMTP_PORT || 587)
    const user = process.env.SMTP_USER
    const pass = process.env.SMTP_PASS

    if (!host || !user || !pass) {
      console.warn('SMTP not configured; skipping email send')
      return NextResponse.json({ ok: true, skipped: true })
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass }
    })

    await transporter.sendMail({
      from: `Arcanum Platform <${user}>`,
      to,
      subject,
      html
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('Email send error:', err)
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 })
  }
} 