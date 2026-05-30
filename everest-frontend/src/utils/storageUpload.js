import { Capacitor } from '@capacitor/core';
import { supabase } from '../supabase';// Helper to manually parse Data URIs or accept Blob directly
const getBlobSafely = async (urlOrBlob) => {
  if (urlOrBlob instanceof Blob || urlOrBlob instanceof File) {
    return urlOrBlob;
  }
  
  if (typeof urlOrBlob === 'string' && urlOrBlob.startsWith('data:')) {
    const arr = urlOrBlob.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
  
  if (typeof urlOrBlob === 'string') {
    const response = await fetch(urlOrBlob);
    return await response.blob();
  }
  
  throw new Error("Invalid input to getBlobSafely");
};



/**
 * Compresses an image blob using HTML5 Canvas.
 * @param {Blob} fileBlob - The image blob to compress
 * @returns {Promise<Blob>} The compressed image blob
 */
export const compressImage = (fileBlob, maxWidth = 1600, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    // Creating a local blob URL prevents CORS canvas tainting issues
    const objectUrl = URL.createObjectURL(fileBlob);
    
    const img = new Image();
    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Scale down if larger than maxWidth
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxWidth) {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        // Fill background for transparency in case of PNG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(objectUrl);
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          },
          'image/jpeg',
          quality
        );
      } catch (err) {
        URL.revokeObjectURL(objectUrl);
        reject(err);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for compression'));
    };
    img.src = objectUrl;
  });
};

/**
 * Uploads a blob/object URL to Firebase Storage and returns the persistent download URL.
 * Automatically compresses the image before uploading.
 * @param {string} localUrl - The local blob URL (e.g. from createObjectURL)
 * @param {string} folder - The target folder in Storage (e.g. 'profile_pics')
 * @param {string} filename - The target filename without extension (e.g. 'EMF00001_pan')
 * @returns {Promise<string>} The persistent download URL
 */
export const uploadImageToStorage = async (localUrlOrBlob, folder, filename) => {
  // If it's already a Firebase/Supabase Storage URL or empty, skip upload
  if (!localUrlOrBlob) {
    return localUrlOrBlob;
  }
  if (typeof localUrlOrBlob === 'string' && (localUrlOrBlob.includes('firebasestorage.googleapis.com') || localUrlOrBlob.includes('supabase.co'))) {
    return localUrlOrBlob;
  }

  try {
    const blob = await getBlobSafely(localUrlOrBlob);

    let finalBlob = blob;
    let extension = 'jpg';
    let contentType = 'image/jpeg';

    let isPdf = blob.type === 'application/pdf';
    if (!isPdf && typeof localUrlOrBlob === 'string' && localUrlOrBlob.toLowerCase().endsWith('.pdf')) {
      isPdf = true;
    }

    if (isPdf) {
      // It's a PDF, do NOT compress it using canvas!
      extension = 'pdf';
      contentType = 'application/pdf';
      finalBlob = blob;
    } else {
      // It's an image, safe to compress using HTML5 Canvas
      try {
        finalBlob = await compressImage(blob, 1600, 0.7);
      } catch (err) {
        console.warn('Compression failed, falling back to original image blob:', err);
        finalBlob = blob;
        extension = blob.type.split('/')[1] || 'jpg';
        contentType = blob.type || 'image/jpeg';
      }
    }
    
    const filePath = `${folder}/${filename}_${Date.now()}.${extension}`;
    
    // Supabase standard upload (no need to convert to base64)
    const { data, error } = await supabase.storage
      .from('everest-storage')
      .upload(filePath, finalBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: contentType
      });

    if (error) {
      throw error;
    }
    
    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from('everest-storage')
      .getPublicUrl(filePath);
      
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error('Error uploading to Supabase Storage:', error);
    throw error;
  }
};
