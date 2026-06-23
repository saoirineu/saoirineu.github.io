import { describe, expect, it } from 'vitest';

import {
  getUploadContentType,
  imageCompressionThresholdBytes,
  isUploadTypeAllowed,
  formatFileSize,
  shouldOfferImageCompression,
  uploadMaxBytes,
  validateUploadFile
} from './uploads';

describe('upload helpers', () => {
  it('accepts only supported types', () => {
    expect(isUploadTypeAllowed({ name: 'doc.pdf', type: 'application/pdf' } as File)).toBe(true);
    expect(isUploadTypeAllowed({ name: 'scan.jpg', type: 'image/jpeg' } as File)).toBe(true);
    expect(isUploadTypeAllowed({ name: 'scan.png', type: 'image/png' } as File)).toBe(true);
    expect(isUploadTypeAllowed({ name: 'scan.heic', type: 'image/heic' } as File)).toBe(false);
  });

  it('validates size and type', () => {
    expect(validateUploadFile({ name: 'scan.pdf', size: 1024, type: 'application/pdf' } as File)).toBeNull();
    expect(
      validateUploadFile({
        name: 'scan.heic',
        size: 1024,
        type: 'image/heic'
      } as File)
    ).toBe('invalid-type');
    expect(
      validateUploadFile({
        name: 'scan.pdf',
        size: uploadMaxBytes + 1,
        type: 'application/pdf'
      } as File)
    ).toBe('file-too-large');
  });

  it('infers upload content type from extension when the browser omits it', () => {
    expect(getUploadContentType({ name: 'scan.pdf', type: '' } as File)).toBe('application/pdf');
    expect(getUploadContentType({ name: 'scan.jpeg', type: '' } as File)).toBe('image/jpeg');
    expect(getUploadContentType({ name: 'scan.png', type: '' } as File)).toBe('image/png');
    expect(getUploadContentType({ name: 'scan.pdf', type: 'application/pdf' } as File)).toBe('application/pdf');
    expect(getUploadContentType({ name: 'scan.heic', type: '' } as File)).toBeUndefined();
  });

  it('offers compression only for larger jpeg or png images', () => {
    expect(
      shouldOfferImageCompression({
        name: 'scan.jpg',
        size: imageCompressionThresholdBytes + 1,
        type: 'image/jpeg'
      } as File)
    ).toBe(true);
    expect(
      shouldOfferImageCompression({
        name: 'scan.pdf',
        size: imageCompressionThresholdBytes + 1,
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
