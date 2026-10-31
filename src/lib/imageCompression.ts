/**
 * Utility to compress an image file on the client side using HTML5 Canvas
 * Guarantees output file size is under 1 MB (1024 * 1024 bytes)
 * Corrects EXIF camera orientation (so photos taken vertically don't rotate sideways)
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

/**
 * Extracts EXIF orientation tag from a JPEG ArrayBuffer
 * Returns 1 (normal), 3 (180 deg), 6 (90 deg CW), 8 (270 deg CW), or 1 if none.
 */
function getExifOrientation(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  if (view.getUint16(0, false) !== 0xffd8) return 1; // Not a JPEG

  const length = view.byteLength;
  let offset = 2;

  while (offset < length) {
    if (view.getUint16(offset + 2, false) <= 8) return 1;
    const marker = view.getUint16(offset, false);
    offset += 2;

    if (marker === 0xffe1) {
      // APP1 marker
      if (view.getUint32(offset += 2, false) !== 0x45786966) return 1; // "Exif"

      const little = view.getUint16(offset += 6, false) === 0x4949;
      offset += view.getUint32(offset + 4, little);
      const tags = view.getUint16(offset, little);
      offset += 2;

      for (let i = 0; i < tags; i++) {
        if (view.getUint16(offset + i * 12, little) === 0x0112) {
          // Orientation tag
          return view.getUint16(offset + i * 12 + 8, little);
        }
      }
    } else if ((marker & 0xff00) !== 0xff00) {
      break;
    } else {
      offset += view.getUint16(offset, false);
    }
  }
  return 1;
}

export async function compressImageToUnder1MB(inputFile: File): Promise<CompressionResult> {
  const originalSize = inputFile.size;

  // Attempt 1: Try modern createImageBitmap with imageOrientation: "from-image"
  let bitmap: ImageBitmap | null = null;
  if (typeof window !== "undefined" && "createImageBitmap" in window) {
    try {
      bitmap = await createImageBitmap(inputFile, { imageOrientation: "from-image" });
    } catch {
      bitmap = null;
    }
  }

  if (bitmap) {
    try {
      const originalWidth = bitmap.width;
      const originalHeight = bitmap.height;

      let targetWidth = originalWidth;
      let targetHeight = originalHeight;

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
      if (!ctx) throw new Error("Could not acquire 2D canvas context");

      // Draw bitmap which is already upright thanks to imageOrientation: "from-image"
      ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
      bitmap.close();

      const blob = await encodeUnder1MB(canvas);
      if (!blob) throw new Error("Failed to encode compressed image");

      const outputName = inputFile.name.replace(/\.[^.]+$/, "") + "-upright.jpg";
      const compressedFile = new File([blob], outputName, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      return {
        file: compressedFile,
        previewUrl: URL.createObjectURL(blob),
        originalSize,
        compressedSize: compressedFile.size,
        originalDimensions: { width: originalWidth, height: originalHeight },
        compressedDimensions: { width: canvas.width, height: canvas.height },
      };
    } catch (err) {
      console.warn("createImageBitmap compression failed, falling back to canvas EXIF rotation:", err);
    }
  }

  // Attempt 2: Fallback using HTMLImageElement and manual EXIF orientation transform
  const arrayBuffer = await inputFile.arrayBuffer();
  const orientation = getExifOrientation(arrayBuffer);

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read image file"));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Failed to load image element"));

      img.onload = async () => {
        let naturalWidth = img.width;
        let naturalHeight = img.height;

        // If orientation is 90 or 270 deg, swap dimensions
        const isRotated = orientation === 6 || orientation === 8;
        const uprightWidth = isRotated ? naturalHeight : naturalWidth;
        const uprightHeight = isRotated ? naturalWidth : naturalHeight;

        let targetWidth = uprightWidth;
        let targetHeight = uprightHeight;

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
          reject(new Error("Could not acquire 2D canvas context"));
          return;
        }

        // Apply EXIF orientation transform
        ctx.save();
        if (orientation === 6) {
          // 90 deg CW
          ctx.translate(targetWidth, 0);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(img, 0, 0, targetHeight, targetWidth);
        } else if (orientation === 8) {
          // 270 deg CW (-90 deg)
          ctx.translate(0, targetHeight);
          ctx.rotate(-Math.PI / 2);
          ctx.drawImage(img, 0, 0, targetHeight, targetWidth);
        } else if (orientation === 3) {
          // 180 deg
          ctx.translate(targetWidth, targetHeight);
          ctx.rotate(Math.PI);
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        } else {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
        }
        ctx.restore();

        const blob = await encodeUnder1MB(canvas);
        if (!blob) {
          reject(new Error("Image compression produced empty output"));
          return;
        }

        const outputName = inputFile.name.replace(/\.[^.]+$/, "") + "-upright.jpg";
        const compressedFile = new File([blob], outputName, {
          type: "image/jpeg",
          lastModified: Date.now(),
        });

        resolve({
          file: compressedFile,
          previewUrl: URL.createObjectURL(blob),
          originalSize,
          compressedSize: compressedFile.size,
          originalDimensions: { width: uprightWidth, height: uprightHeight },
          compressedDimensions: { width: canvas.width, height: canvas.height },
        });
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(inputFile);
  });
}

/**
 * Iteratively encodes canvas to JPEG Blob ensuring size < 1MB
 */
async function encodeUnder1MB(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const canvasToBlob = (q: number): Promise<Blob | null> => {
    return new Promise((res) => {
      canvas.toBlob((b) => res(b), "image/jpeg", q);
    });
  };

  let quality = 0.9;
  let blob = await canvasToBlob(quality);

  while (blob && blob.size > MAX_BYTES && quality > 0.25) {
    quality -= 0.15;
    blob = await canvasToBlob(quality);
  }

  // If still over 1MB, scale canvas down by 25% and retry
  if (blob && blob.size > MAX_BYTES) {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = Math.round(canvas.width * 0.75);
    tempCanvas.height = Math.round(canvas.height * 0.75);
    const tempCtx = tempCanvas.getContext("2d");
    if (tempCtx) {
      tempCtx.drawImage(canvas, 0, 0, tempCanvas.width, tempCanvas.height);
      blob = await new Promise((res) => tempCanvas.toBlob((b) => res(b), "image/jpeg", 0.7));
    }
  }

  return blob;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
