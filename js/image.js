// image.js — prepares a photo before it is sent to the AI.
//
// iPhone photos are big (often 3-5 MB, 4000+ pixels wide). The AI does not need
// that much detail to recognize a mug or a banana, so we shrink the photo on the
// phone first. Smaller photo = faster upload, less mobile data, smaller quota use.
// Everything happens in memory; the photo is never saved.

const MAX_SIDE = 1024;   // longest side in pixels after shrinking
const QUALITY = 0.82;    // JPEG quality (0 to 1): good enough, much smaller

// Loads an image file into an <img> element (the browser decodes JPEG/HEIC/PNG
// and applies the iPhone's rotation information automatically).
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('unreadable image'));
    };
    img.src = url;
  });
}

// Turns a Blob (binary file) into base64 text, the format the Gemini API expects.
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Main function: file from the camera -> { base64, mimeType, previewUrl, width, height }
// previewUrl shows the photo on screen; call URL.revokeObjectURL(previewUrl) when done.
export async function prepareImage(file) {
  if (!file || !file.type.startsWith('image/')) throw new Error('not an image');
  const { img, url } = await loadImage(file);

  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));

  // A <canvas> is a drawing surface: we draw the photo smaller, then export it as JPEG.
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff'; // JPEG has no transparency; use a white background
  context.fillRect(0, 0, width, height);
  context.drawImage(img, 0, 0, width, height);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
  if (!blob) {
    URL.revokeObjectURL(url);
    throw new Error('could not compress image');
  }
  const base64 = await blobToBase64(blob);
  // Free the canvas memory right away (important on iPhone, which has strict limits).
  canvas.width = 0;
  canvas.height = 0;

  return { base64, mimeType: 'image/jpeg', previewUrl: url, width, height };
}
