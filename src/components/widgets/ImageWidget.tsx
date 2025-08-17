'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'

interface ImageWidgetProps {
  url: string
  title?: string
  maxWidth?: number
  maxHeight?: number
  width?: number
  height?: number
  resizable?: boolean
  onResize?: (width: number, height: number) => void
}

export default function ImageWidget({
  url,
  title = 'Image',
  maxWidth = 480,
  maxHeight = 360,
  width,
  height,
  resizable = false,
  onResize
}: ImageWidgetProps) {
  const [w, setW] = useState<number>(width || maxWidth)
  const [h, setH] = useState<number>(height || maxHeight)
  const boxRef = useRef<HTMLDivElement | null>(null)
  const startRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => {
    if (typeof width === 'number') setW(width)
  }, [width])
  useEffect(() => {
    if (typeof height === 'number') setH(height)
  }, [height])

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    e.preventDefault()
    startRef.current = { x: e.clientX, y: e.clientY, w, h };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
  }, [w, h])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return
    const dx = e.clientX - startRef.current.x
    const dy = e.clientY - startRef.current.y
    const newW = Math.max(160, startRef.current.w + dx)
    const newH = Math.max(120, startRef.current.h + dy)
    setW(newW)
    setH(newH)
  }, [])

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!startRef.current) return
    const { w: sw, h: sh, x, y } = startRef.current
    const dx = e.clientX - x
    const dy = e.clientY - y
    const finalW = Math.max(160, sw + dx)
    const finalH = Math.max(120, sh + dy)
    setW(finalW)
    setH(finalH)
    startRef.current = null
    onResize?.(finalW, finalH)
  }, [onResize])

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-700 shadow-xl select-none" style={{ width: w }} ref={boxRef}>
      <div className="text-xs text-gray-300 mb-1 truncate">{title}</div>
      <div className="relative rounded overflow-hidden" style={{ height: h }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={title} className="block w-full h-full" style={{ objectFit: 'contain' }} />
        {resizable && (
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="absolute bottom-1 right-1 w-4 h-4 bg-gray-900/80 border border-gray-600 rounded-sm cursor-nwse-resize"
            title="Потяни, чтобы изменить размер"
          />
        )}
      </div>
    </div>
  )
} 