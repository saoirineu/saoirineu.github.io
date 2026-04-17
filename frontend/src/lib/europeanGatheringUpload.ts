export const europeanGatheringUploadAccept = '.pdf,.jpg,.jpeg,.png';
export const europeanGatheringUploadMaxBytes = 10 * 1024 * 1024;
export const europeanGatheringImageCompressionThresholdBytes = 3 * 1024 * 1024;
const europeanGatheringImageCompressionMaxDimension = 2200;

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png']);
const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];

export type EuropeanGatheringUploadValidationError = 'invalid-type' | 'file-too-large';

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KB', 'MB', 'GB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function hasAllowedExtension(fileName: string) {
  const normalizedName = fileName.toLowerCase();
  return allowedExtensions.some(extension => normalizedName.endsWith(extension));
}

export function isEuropeanGatheringUploadTypeAllowed(file: Pick<File, 'name' | 'type'>) {
  const normalizedType = file.type.toLowerCase();
  return allowedMimeTypes.has(normalizedType) || (!normalizedType && hasAllowedExtension(file.name));
}

export function isEuropeanGatheringCompressibleImage(file: Pick<File, 'type'>) {
  return file.type === 'image/jpeg' || file.type === 'image/png';
}

export function validateEuropeanGatheringUploadFile(file: Pick<File, 'name' | 'size' | 'type'>): EuropeanGatheringUploadValidationError | null {
  if (!isEuropeanGatheringUploadTypeAllowed(file)) {
    return 'invalid-type';
  }

  if (file.size > europeanGatheringUploadMaxBytes) {
    return 'file-too-large';
  }

  return null;
}

export function shouldOfferEuropeanGatheringImageCompression(file: Pick<File, 'size' | 'type'>) {
  return isEuropeanGatheringCompressibleImage(file) && file.size > europeanGatheringImageCompressionThresholdBytes;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to read image.'));
    };

    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, mimeType: string, quality?: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(blob => {
      if (!blob) {
        reject(new Error('Unable to compress image.'));
        return;
      }

      resolve(blob);
    }, mimeType, quality);
  });
}

export async function compressEuropeanGatheringImage(file: File) {
  if (!isEuropeanGatheringCompressibleImage(file)) {
    return file;
  }

  const image = await loadImage(file);
  const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = longestSide > europeanGatheringImageCompressionMaxDimension
    ? europeanGatheringImageCompressionMaxDimension / longestSide
    : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to compress image.');
  }

  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const quality = file.type === 'image/jpeg' ? 0.82 : undefined;
  const blob = await canvasToBlob(canvas, file.type, quality);

  if (blob.size >= file.size) {
    return file;
  }

  return new File([blob], file.name, {
    type: blob.type || file.type,
    lastModified: file.lastModified
  });
}
