import { requireClient } from './api/helpers';

const BUCKET = 'visitor-photos';

function dataUrlToBlob(dataUrl: string): { blob: Blob; ext: string } {
  const match = /^data:(.+?);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const mime = match[1];
  const b64 = match[2];
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mime });
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  return { blob, ext };
}

/**
 * Uploads a visitor photo (provided as a base64 data URL, e.g. from
 * `canvas.toDataURL()`) to the `visitor-photos` bucket. Returns the public URL
 * that should be stored in `visitors.photo_url`.
 */
export async function uploadVisitorPhoto(
  visitorId: string,
  dataUrl: string
): Promise<string> {
  const client = requireClient();
  const { blob, ext } = dataUrlToBlob(dataUrl);
  const path = `${visitorId}.${ext}`;

  const { error } = await client.storage
    .from(BUCKET)
    .upload(path, blob, { contentType: blob.type, upsert: true });

  if (error) throw error;

  const { data } = client.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Quick test: is `value` a data URL? Used at the write boundary to decide
 * whether a visitor still carries raw base64 (needs upload) or a Supabase URL.
 */
export function isDataUrl(value: string | undefined | null): boolean {
  return typeof value === 'string' && value.startsWith('data:');
}
