const DEFAULT_MAX = 1024;
const DEFAULT_QUALITY = 0.85;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo leer la imagen'));
    img.src = src;
  });
}

function canvasToJpegDataUrl(
  source: HTMLImageElement | HTMLVideoElement,
  maxSize: number,
  quality: number
): string {
  const w = 'videoWidth' in source ? source.videoWidth : source.naturalWidth;
  const h = 'videoHeight' in source ? source.videoHeight : source.naturalHeight;
  if (!w || !h) throw new Error('Imagen vacía');

  const scale = Math.min(1, maxSize / Math.max(w, h));
  const width = Math.round(w * scale);
  const height = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas no disponible');
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', quality);
}

export async function fileToCompressedDataUrl(
  file: File,
  maxSize = DEFAULT_MAX,
  quality = DEFAULT_QUALITY
): Promise<string> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    return canvasToJpegDataUrl(img, maxSize, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function videoFrameToDataUrl(
  video: HTMLVideoElement,
  maxSize = DEFAULT_MAX,
  quality = DEFAULT_QUALITY
): string {
  return canvasToJpegDataUrl(video, maxSize, quality);
}
