/**
 * Utility to compress an image file on the client side using HTML5 Canvas
 * Guarantees output file size is under 1 MB (1024 * 1024 bytes)
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  compressedSize: number;
  originalDimensions: { width: number; height: number };
  compressedDimensions: { width: number; height: number };
}

const MAX_BYTES = 1024 * 1024; // 1 MB limit
const MAX_DIMENSION = 1920; // 1080p-4k downscale to preserve diagnostic leaf clarity

export async function compressImageToUnder1MB(inputFile: File): Promise<CompressionResult> {
  const originalSize = inputFile.size;

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onerror = () => {
      reject(new Error("Failed to read image file"));
    };

    reader.onload = (event) => {
      const img = new Image();

      img.onerror = () => {
        reject(new Error("Failed to load image element"));
      };

      img.onload = async () => {
        const originalWidth = img.width;
        const originalHeight = img.height;

        // If file is already under 1MB and dimensions are reasonable, we still can use canvas or the file directly
        // However, mobile phones capture 12-48MP images (4000x3000), which easily exceed 4-15MB.
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        // Scale down if larger than MAX_DIMENSION
        if (targetWidth > MAX_DIMENSION || targetHeight > MAX_DIMENSION) {
          if (targetWidth > targetHeight) {
            targetHeight = Math.round((targetHeight * MAX_DIMENSION) / targetWidth);
            targetWidth = MAX_DIMENSION;
          } else {
            targetWidth = Math.round((targetWidth * MAX_DIMENSION) / targetHeight);
            targetHeight = MAX_DIMENSION;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not acquire 2D canvas rendering context"));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Iteratively find quality that ensures < 1 MB
        let quality = 0.9;
        let blob: Blob | null = null;

        // Helper to convert canvas to blob
        const canvasToBlob = (q: number): Promise<Blob | null> => {
          return new Promise((res) => {
            canvas.toBlob(
              (b) => res(b),
              "image/jpeg",
              q
            );
          });
        };

        blob = await canvasToBlob(quality);

        // If still > 1MB, progressively lower quality or scale canvas
        while (blob && blob.size > MAX_BYTES && quality > 0.2) {
          quality -= 0.15;
          blob = await canvasToBlob(quality);
        }

        // In the rare case it's still > 1MB, halve dimensions and retry
        if (blob && blob.size > MAX_BYTES) {
          canvas.width = Math.round(targetWidth * 0.7);
          canvas.height = Math.round(targetHeight * 0.7);
          const scaledCtx = canvas.getContext("2d");
          if (scaledCtx) {
            scaledCtx.drawImage(img, 0, 0, canvas.width, canvas.height);
            blob = await canvasToBlob(0.7);
          }
        }

        if (!blob) {
          reject(new Error("Image compression produced empty output"));
          return;
        }

        const outputName = inputFile.name.replace(/\.[^.]+$/, "") + "-compressed.jpg";
        const compressedFile = new File([blob], outputName, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        const previewUrl = URL.createObjectURL(blob);

        resolve({
          file: compressedFile,
          previewUrl,
          originalSize,
          compressedSize: compressedFile.size,
          originalDimensions: { width: originalWidth, height: originalHeight },
          compressedDimensions: { width: canvas.width, height: canvas.height },
        });
      };

      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(inputFile);
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

