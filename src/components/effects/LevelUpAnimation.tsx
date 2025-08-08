'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface LevelUpAnimationProps {
  isActive: boolean
  newLevel: number
  onComplete: () => void
}

interface Particle {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  color: string
  size: number
  life: number
  maxLife: number
}

export default function LevelUpAnimation({ isActive, newLevel, onComplete }: LevelUpAnimationProps) {
  const particlesRef = useRef<Particle[]>([])
  const onCompleteRef = useRef(onComplete)
  const [animationStage, setAnimationStage] = useState<'burst' | 'glow' | 'complete'>('burst')
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number>()

  // Держим актуальный onComplete в ref без перезапуска основного эффекта
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Создание частиц
  const createParticles = () => {
    const newParticles: Particle[] = []
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    
    // Цвета для частиц (золотой, фиолетовый, синий)
    const colors = ['#FFD700', '#8B5CF6', '#3B82F6', '#10B981', '#F59E0B']
    
    for (let i = 0; i < 50; i++) {
      const angle = (i / 50) * Math.PI * 2
      const velocity = 2 + Math.random() * 4
      
      newParticles.push({
        id: `particle-${i}`,
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        life: 100,
        maxLife: 100
      })
    }
    
    // Дополнительные взрывные частицы
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: `burst-${i}`,
        x: centerX + (Math.random() - 0.5) * 100,
        y: centerY + (Math.random() - 0.5) * 100,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        life: 60,
        maxLife: 60
      })
    }
    
    particlesRef.current = newParticles
  }

  // Обновление частиц
  const updateParticles = () => {
    const updated = particlesRef.current
      .map(particle => ({
        ...particle,
        x: particle.x + particle.vx,
        y: particle.y + particle.vy,
        life: particle.life - 1,
        vx: particle.vx * 0.98,
        vy: particle.vy * 0.98 + 0.1
      }))
      .filter(p => p.life > 0)

    particlesRef.current = updated
  }

  // Рендеринг частиц на Canvas
  const renderParticles = useCallback((ctx: CanvasRenderingContext2D, particles: Particle[]) => {
    particles.forEach((particle: Particle) => {
      ctx.save()
      ctx.globalAlpha = particle.life / particle.maxLife
      ctx.fillStyle = particle.color
      ctx.beginPath()
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
  }, [])

  // Проигрывание звука
  const playLevelUpSound = () => {
    // Создаем аудио-контекст для генерации звука
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      
      // Глубокий басовый гул с нарастанием
      const oscillator1 = audioContext.createOscillator()
      const gainNode1 = audioContext.createGain()
      
      oscillator1.type = 'sawtooth'
      oscillator1.frequency.setValueAtTime(60, audioContext.currentTime)
      oscillator1.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.5)
      
      gainNode1.gain.setValueAtTime(0, audioContext.currentTime)
      gainNode1.gain.exponentialRampToValueAtTime(0.3, audioContext.currentTime + 0.3)
      gainNode1.gain.exponentialRampToValueAtTime(0.1, audioContext.currentTime + 1.5)
      
      oscillator1.connect(gainNode1)
      gainNode1.connect(audioContext.destination)
      
      // Кристаллический звон
      const oscillator2 = audioContext.createOscillator()
      const gainNode2 = audioContext.createGain()
      
      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(800, audioContext.currentTime + 1)
      oscillator2.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 1.2)
      
      gainNode2.gain.setValueAtTime(0, audioContext.currentTime + 1)
      gainNode2.gain.exponentialRampToValueAtTime(0.4, audioContext.currentTime + 1.1)
      gainNode2.gain.exponentialRampToValueAtTime(0, audioContext.currentTime + 2)
      
      oscillator2.connect(gainNode2)
      gainNode2.connect(audioContext.destination)
      
      // Запуск звуков
      oscillator1.start(audioContext.currentTime)
      oscillator1.stop(audioContext.currentTime + 1.5)
      
      oscillator2.start(audioContext.currentTime + 1)
      oscillator2.stop(audioContext.currentTime + 2)
    }
  }

  // Основной цикл анимации
  useEffect(() => {
    if (!isActive) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d') || null
    if (!canvas || !ctx) return

    const animate = () => {
      // Очистка
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // Обновление и отрисовка
      updateParticles()
      renderParticles(ctx, particlesRef.current)
      animationFrameRef.current = requestAnimationFrame(animate)
    }

    // Последовательность анимации
    const runAnimation = async () => {
      // Этап 1: Взрыв частиц
      setAnimationStage('burst')
      createParticles()
      playLevelUpSound()
      
      // Этап 2: Свечение (через 1 секунду)
      setTimeout(() => {
        setAnimationStage('glow')
      }, 1000)
      
      // Этап 3: Завершение (через 3 секунды)
      setTimeout(() => {
        setAnimationStage('complete')
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current)
        }
        onCompleteRef.current?.()
      }, 3000)
    }

    runAnimation()
    animationFrameRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isActive, renderParticles])

  // Обновление размера canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (canvas) {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
  }, [])

  if (!isActive) return null

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* Canvas для частиц */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ zIndex: 1 }}
      />

      {/* Центральный взрыв света */}
      <div 
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ${
          animationStage === 'burst' ? 'scale-0' : 'scale-100'
        }`}
        style={{ zIndex: 2 }}
      >
        <div className="w-40 h-40 bg-gradient-to-r from-yellow-400 via-purple-500 to-blue-500 rounded-full blur-xl opacity-80 animate-pulse"></div>
      </div>

      {/* Глобальное свечение экрана */}
      <div 
        className={`absolute inset-0 transition-all duration-2000 ${
          animationStage === 'glow' 
            ? 'bg-gradient-to-br from-yellow-500/20 via-purple-500/20 to-blue-500/20' 
            : 'bg-transparent'
        }`}
        style={{ zIndex: 3 }}
      />

      {/* Центральное уведомление */}
      <div 
        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center transition-all duration-1000 ${
          animationStage === 'burst' ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
        }`}
        style={{ zIndex: 4 }}
      >
        <div className="bg-gray-900/90 backdrop-blur-lg rounded-2xl p-8 border-4 border-gradient-to-r from-yellow-400 to-purple-600 shadow-2xl">
          <div className="text-6xl mb-4 animate-bounce">👑</div>
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-purple-600 mb-2">
            LEVEL UP!
          </h2>
          <div className="text-2xl text-white font-bold mb-4">
            Уровень {newLevel}
          </div>
          <div className="text-lg text-gray-300">
            Ты поглотил звезду силы! 🌟
          </div>
        </div>
      </div>

      {/* Пульсирующие кольца */}
      {animationStage === 'glow' && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{ zIndex: 1 }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`absolute w-${20 + i * 20} h-${20 + i * 20} border-4 border-purple-500/30 rounded-full`}
              style={{
                animation: `ping 2s cubic-bezier(0, 0, 0.2, 1) infinite`,
                animationDelay: `${i * 0.3}s`,
                marginLeft: `${-(10 + i * 10) * 4}px`,
                marginTop: `${-(10 + i * 10) * 4}px`
              }}
            />
          ))}
        </div>
      )}

      {/* Дополнительные визуальные эффекты */}
      <style jsx>{`
        @keyframes levelUpPulse {
          0%, 100% { 
            transform: scale(1) rotate(0deg);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.1) rotate(180deg);
            opacity: 1;
          }
        }
        
        @keyframes levelUpGlow {
          0%, 100% { 
            box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
          }
          50% { 
            box-shadow: 0 0 40px rgba(139, 92, 246, 0.8), 0 0 60px rgba(59, 130, 246, 0.6);
          }
        }
      `}</style>
    </div>
  )
} 