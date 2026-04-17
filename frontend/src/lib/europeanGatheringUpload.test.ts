import { describe, expect, it } from 'vitest';

import {
  europeanGatheringImageCompressionThresholdBytes,
  europeanGatheringUploadMaxBytes,
  formatFileSize,
  isEuropeanGatheringUploadTypeAllowed,
  shouldOfferEuropeanGatheringImageCompression,
  validateEuropeanGatheringUploadFile
} from './europeanGatheringUpload';

describe('europeanGathering upload helpers', () => {
  it('accepts only supported types', () => {
    expect(isEuropeanGatheringUploadTypeAllowed({ name: 'doc.pdf', type: 'application/pdf' } as File)).toBe(true);
    expect(isEuropeanGatheringUploadTypeAllowed({ name: 'scan.jpg', type: 'image/jpeg' } as File)).toBe(true);
    expect(isEuropeanGatheringUploadTypeAllowed({ name: 'scan.png', type: 'image/png' } as File)).toBe(true);
    expect(isEuropeanGatheringUploadTypeAllowed({ name: 'scan.heic', type: 'image/heic' } as File)).toBe(false);
  });

  it('validates size and type', () => {
    expect(validateEuropeanGatheringUploadFile({ name: 'scan.pdf', size: 1024, type: 'application/pdf' } as File)).toBeNull();
    expect(
      validateEuropeanGatheringUploadFile({
        name: 'scan.heic',
        size: 1024,
        type: 'image/heic'
      } as File)
    ).toBe('invalid-type');
    expect(
      validateEuropeanGatheringUploadFile({
        name: 'scan.pdf',
        size: europeanGatheringUploadMaxBytes + 1,
        type: 'application/pdf'
      } as File)
    ).toBe('file-too-large');
  });

  it('offers compression only for larger jpeg or png images', () => {
    expect(
      shouldOfferEuropeanGatheringImageCompression({
        name: 'scan.jpg',
        size: europeanGatheringImageCompressionThresholdBytes + 1,
        type: 'image/jpeg'
      } as File)
    ).toBe(true);
    expect(
      shouldOfferEuropeanGatheringImageCompression({
        name: 'scan.pdf',
        size: europeanGatheringImageCompressionThresholdBytes + 1,
        type: 'application/pdf'
      } as File)
    ).toBe(false);
  });

  it('formats file sizes for UI copy', () => {
    expect(formatFileSize(900)).toBe('900 B');
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });
});
