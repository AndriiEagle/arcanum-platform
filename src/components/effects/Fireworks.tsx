'use client'

import { useEffect, useRef } from 'react'

interface FireworksProps {
  isActive: boolean
  durationMs?: number
  onComplete: () => void
}

export default function Fireworks({ isActive, durationMs = 3500, onComplete }: FireworksProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!isActive) return

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const resize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', resize)

    type Particle = {
      x: number
      y: number
      vx: number
      vy: number
      life: number
      color: string
      size: number
    }

    const palette = ['#FF3B3B', '#FFD93D', '#6EE7B7', '#60A5FA', '#A78BFA', '#F472B6']

    const bursts: Particle[][] = []

    const spawnBurst = (cx: number, cy: number) => {
      const count = 50 + Math.floor(Math.random() * 30)
      const particles: Particle[] = []
      for (let i = 0; i < count; i++) {
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.2
        const speed = 2 + Math.random() * 4
        particles.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          color: palette[(Math.random() * palette.length) | 0],
          size: 2 + Math.random() * 3
        })
      }
      bursts.push(particles)
    }

    // Initial bursts
    for (let i = 0; i < 3; i++) {
      spawnBurst(
        width * (0.25 + 0.5 * Math.random()),
        height * (0.25 + 0.5 * Math.random())
      )
    }

    const animate = (t: number) => {
      if (!startTimeRef.current) startTimeRef.current = t
      const elapsed = t - startTimeRef.current

      ctx.clearRect(0, 0, width, height)

      // Occasionally spawn new bursts during first 60% duration
      if (elapsed < durationMs * 0.6 && Math.random() < 0.04) {
        spawnBurst(width * Math.random(), height * (0.2 + 0.6 * Math.random()))
      }

      // Render bursts
      bursts.forEach((particles) => {
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i]
          // Update
          p.x += p.vx
          p.y += p.vy
          p.vx *= 0.985
          p.vy = p.vy * 0.985 + 0.08 // gravity
          p.life *= 0.985

          // Draw
          ctx.globalAlpha = Math.max(0.2, p.life)
          ctx.fillStyle = p.color
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
          ctx.fill()
        }
      })

      // Remove faded bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        bursts[i] = bursts[i].filter((p) => p.life > 0.1)
        if (bursts[i].length === 0) bursts.splice(i, 1)
      }

      if (elapsed >= durationMs) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current)
        window.removeEventListener('resize', resize)
        onComplete()
        return
      }

      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', resize)
    }
  }, [isActive, durationMs, onComplete])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
} 