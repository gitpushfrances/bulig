// A photo for Update details (API.md §7.1): at most 1280 px on the long side, WebP (JPEG where the
// browser can't write WebP), about 300 KB, plus a small preview for the form and the draft.
export const PHOTO_MAX_PX = 1280
export const THUMB_PX = 160

function canvasFor(bitmap: ImageBitmap, max: number): HTMLCanvasElement {
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  return canvas
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

export async function shrinkPhoto(file: File): Promise<{ photo: Blob; thumb: string }> {
  if (!file.type.startsWith('image/')) throw new Error('not an image')
  // imageOrientation: the phone's camera writes sideways pixels plus a rotate flag; draw them upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  try {
    const big = canvasFor(bitmap, PHOTO_MAX_PX)
    let photo = await toBlob(big, 'image/webp', 0.8)
    // Old Safari can't write WebP and hands back PNG (or nothing); JPEG is far smaller then.
    if (!photo || photo.type !== 'image/webp') photo = await toBlob(big, 'image/jpeg', 0.8)
    if (!photo) throw new Error('could not encode')
    const small = canvasFor(bitmap, THUMB_PX)
    const thumb = small.toDataURL('image/jpeg', 0.7)
    return { photo, thumb }
  } finally {
    bitmap.close()
  }
}
