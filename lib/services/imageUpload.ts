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

export async function uploadImageResized(file: File, opts: { bucket?: string, pathPrefix?: string, maxSize?: number } = {}): Promise<UploadResult> {
  const supabase = createClient()
  const bucket = opts.bucket || 'public-assets'
  const pathPrefix = opts.pathPrefix || 'uploads'
  const maxSize = opts.maxSize || 256

  const img = await loadImageFromFile(file)
  const canvas = createCanvasFromImage(img, maxSize)
  const blob = await canvasToBlob(canvas, 'image/png')

  const fileName = `${pathPrefix}/${Date.now()}_${Math.random().toString(36).slice(2)}.png`
  const { data, error } = await supabase.storage.from(bucket).upload(fileName, blob, {
    cacheControl: '3600',
    upsert: false,
    contentType: 'image/png'
  })
  if (error) throw error

  const { data: pub } = supabase.storage.from(bucket).getPublicUrl(fileName)
  return { url: pub.publicUrl, path: data.path }
} 