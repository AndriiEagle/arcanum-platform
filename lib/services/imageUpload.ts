import { createClient } from '../supabase/client'

export interface UploadResult {
  url: string
  path: string
}

function createCanvasFromImage(img: HTMLImageElement, maxSize: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
  const width = Math.round(img.width * ratio)
  const height = Math.round(img.height * ratio)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)
  return canvas
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    return img
  } finally {
    // caller may revoke later if needed
  }
}

async function canvasToBlob(canvas: HTMLCanvasElement, mime: string = 'image/png', quality?: number): Promise<Blob> {
  return await new Promise((resolve) => canvas.toBlob(b => resolve(b as Blob), mime, quality))
}

export async function uploadImageResized(file: File, opts: { bucket?: string, pathPrefix?: string, maxSize?: number, isAvatar?: boolean } = {}): Promise<UploadResult> {
  const supabase = createClient()
  const bucket = opts.bucket || 'public-assets'
  const pathPrefix = opts.pathPrefix || 'uploads'
  const maxSize = opts.maxSize || 256
  const isAvatar = opts.isAvatar || false

  console.log('[ImageUpload] Starting upload:', { 
    fileName: file.name, 
    size: file.size, 
    bucket, 
    pathPrefix,
    isAvatar 
  })

  const img = await loadImageFromFile(file)
  const canvas = createCanvasFromImage(img, maxSize)
  const blob = await canvasToBlob(canvas, 'image/png')

  // Для аватаров используем фиксированное имя для поддержки перезаписи
  let fileName: string
  if (isAvatar) {
    fileName = `${pathPrefix}/avatar.png`
  } else {
    fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`
  }

  console.log('[ImageUpload] Uploading to:', fileName)

  // Для аватаров используем upsert для перезаписи
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, {
    cacheControl: '300', // Уменьшаем кэш до 5 минут для аватаров
    upsert: isAvatar, // Перезаписываем аватары, но не другие изображения
    contentType: 'image/png'
  })
  
  if (error) {
    console.error('[ImageUpload] Upload error:', error)
    throw error
  }

  console.log('[ImageUpload] Upload successful:', data.path)

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName)
  
  // Добавляем cache busting для аватаров
  let finalUrl = pub.publicUrl
  if (isAvatar) {
    const cacheBuster = Date.now()
    finalUrl = `${pub.publicUrl}?v=${cacheBuster}`
    console.log('[ImageUpload] Avatar URL with cache busting:', finalUrl)
  }

  return { url: finalUrl, path: data.path }
} 