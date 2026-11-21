// Unpacks text the build stored compressed. The small Apps Script build gzips each library before
// turning it into base64, which makes the files a third of the size to paste and to send.

/** base64 of gzipped UTF-8 text, back to the text. Needs DecompressionStream (Chrome 80 and later). */
export async function inflateBase64(packed) {
  if (typeof DecompressionStream === 'undefined') throw new Error('This browser is too old to open Pixel Trail. Update Chrome and reload.');
  const raw = atob(String(packed).replace(/\s+/g, ''));
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

/** Marks text that travels in pieces (ml5) as packed, so the browser knows to unpack it once joined. */
export const PACKED_MARK = 'GZ1:';
