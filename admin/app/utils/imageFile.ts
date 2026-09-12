/**
 * Turn a picture the user chose into something small enough to store.
 *
 * Nothing in this deployment stores files — the API server's disk is ephemeral,
 * so an uploaded file would disappear on the next deploy. A profile photo is
 * small and belongs to exactly one row, so the browser does the work: it
 * downscales the picture to a square, re-encodes it as JPEG, and the result
 * (a data URL of a few tens of kilobytes) is what gets saved.
 *
 * That trade is fine for an avatar and wrong for course media, which is why
 * cover images and lesson videos take a URL instead.
 */
export const MAX_SOURCE_BYTES = 8 * 1024 * 1024; // 8MB off the user's disk
const SIZE = 256; // the largest the avatar is ever drawn, doubled for retina
const QUALITY = 0.82;

export class ImageFileError extends Error {}

export async function fileToAvatarDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new ImageFileError('not-an-image');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new ImageFileError('too-large');
  }

  const bitmap = await loadBitmap(file);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageFileError('no-canvas');

  // Cover-crop to a square: take the largest centred square of the source, so a
  // portrait or a landscape photo both end up as a face, not a letterbox.
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, SIZE, SIZE);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  return canvas.toDataURL('image/jpeg', QUALITY);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // Safari has refused some formats here; fall through to <img>.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new ImageFileError('unreadable'));
      img.src = url;
    });
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
}
