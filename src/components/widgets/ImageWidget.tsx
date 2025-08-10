'use client'

import React from 'react'

interface ImageWidgetProps {
  url: string
  title?: string
  maxWidth?: number
  maxHeight?: number
}

export default function ImageWidget({ url, title = 'Image', maxWidth = 480, maxHeight = 360 }: ImageWidgetProps) {
  return (
    <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-700 shadow-xl" style={{ maxWidth }}>
      <div className="text-xs text-gray-300 mb-1 truncate">{title}</div>
      <div className="relative rounded overflow-hidden" style={{ maxHeight }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={title} className="block w-full h-auto" style={{ objectFit: 'contain', maxHeight }} />
      </div>
    </div>
  )
} 