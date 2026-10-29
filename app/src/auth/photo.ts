// Turns a chosen picture into a small square avatar: centre-cropped, 256 × 256, WebP.
// About 15–30 KB as a data URL, so it fits on the phone next to the account (localStorage).
export const AVATAR_PX = 256

export async function toAvatar(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('not an image')
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = AVATAR_PX
  canvas.height = AVATAR_PX
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('no canvas')
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    AVATAR_PX,
    AVATAR_PX,
  )
  bitmap.close()
  const webp = canvas.toDataURL('image/webp', 0.82)
  // Old Safari can't write WebP and falls back to PNG; JPEG is far smaller then.
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.82)
}
