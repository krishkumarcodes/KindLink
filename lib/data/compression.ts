/**
 * Client-side file compression and validation utility for KindLink
 * Compresses images before upload to maintain fast speeds and stay strictly within Supabase 5MB bucket limits.
 */
export async function compressImageFile(file: File, maxSizeBytes = 5 * 1024 * 1024): Promise<File> {
  // If PDF, validate size
  if (file.type === 'application/pdf') {
    if (file.size > maxSizeBytes) {
      throw new Error(
        `PDF document exceeds 5 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB). Please select a smaller file.`
      );
    }
    return file;
  }

  // Non-image fallback
  if (!file.type.startsWith('image/')) {
    if (file.size > maxSizeBytes) {
      throw new Error(`File exceeds 5 MB limit. Please select a smaller file.`);
    }
    return file;
  }

  // If already under 1.2 MB, return as is
  if (file.size <= 1.2 * 1024 * 1024) {
    return file;
  }

  if (typeof window === 'undefined') {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1920;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Failed to load image for compression'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file for compression'));
    reader.readAsDataURL(file);
  });
}
