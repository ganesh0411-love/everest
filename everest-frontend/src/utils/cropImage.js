export const createImage = (url) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

export default async function getCroppedImg(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  
  // Instant Processing Optimization: Scale down massive camera images
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;
  const MAX_DIM = 800;
  if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / targetWidth, MAX_DIM / targetHeight);
    targetWidth *= ratio;
    targetHeight *= ratio;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  if (!ctx) return null;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  // Return base64 instantly instead of using the slow async toBlob
  return canvas.toDataURL('image/png'); 
}

export const removeBackgroundFromImage = async (imageSrc) => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  
  // Downscale to 800px max for instant micro-second processing
  let targetWidth = image.width;
  let targetHeight = image.height;
  const MAX_DIM = 800;
  if (targetWidth > MAX_DIM || targetHeight > MAX_DIM) {
    const ratio = Math.min(MAX_DIM / targetWidth, MAX_DIM / targetHeight);
    targetWidth *= ratio;
    targetHeight *= ratio;
  }
  
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
  
  const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imageData.data;
  
  // Fast threshold-based background removal (assuming white/light grey backgrounds typical for documents/ID photos)
  const bgR = data[0], bgG = data[1], bgB = data[2];
  const tolerance = 50; 

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    // Calculate color distance from top-left corner
    const dist = Math.abs(r - bgR) + Math.abs(g - bgG) + Math.abs(b - bgB);
    
    // If it's pure white or close to the corner background color, remove it
    if (dist < tolerance * 3 || (r > 240 && g > 240 && b > 240)) {
      data[i+3] = 0; // Make transparent
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL('image/png'); // Must be PNG for transparent BG
}
