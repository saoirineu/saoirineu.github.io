import { describe, expect, it } from 'vitest';

import {
  encontroEuropeuImageCompressionThresholdBytes,
  encontroEuropeuUploadMaxBytes,
  formatFileSize,
  isEncontroEuropeuUploadTypeAllowed,
  shouldOfferEncontroEuropeuImageCompression,
  validateEncontroEuropeuUploadFile
} from './encontroEuropeuUpload';

describe('encontro europeu upload helpers', () => {
  it('accepts only supported types', () => {
    expect(isEncontroEuropeuUploadTypeAllowed({ name: 'doc.pdf', type: 'application/pdf' } as File)).toBe(true);
    expect(isEncontroEuropeuUploadTypeAllowed({ name: 'scan.jpg', type: 'image/jpeg' } as File)).toBe(true);
    expect(isEncontroEuropeuUploadTypeAllowed({ name: 'scan.png', type: 'image/png' } as File)).toBe(true);
    expect(isEncontroEuropeuUploadTypeAllowed({ name: 'scan.heic', type: 'image/heic' } as File)).toBe(false);
  });

  it('validates size and type', () => {
    expect(validateEncontroEuropeuUploadFile({ name: 'scan.pdf', size: 1024, type: 'application/pdf' } as File)).toBeNull();
    expect(
      validateEncontroEuropeuUploadFile({
        name: 'scan.heic',
        size: 1024,
        type: 'image/heic'
      } as File)
    ).toBe('invalid-type');
    expect(
      validateEncontroEuropeuUploadFile({
        name: 'scan.pdf',
        size: encontroEuropeuUploadMaxBytes + 1,
        type: 'application/pdf'
      } as File)
    ).toBe('file-too-large');
  });

  it('offers compression only for larger jpeg or png images', () => {
    expect(
      shouldOfferEncontroEuropeuImageCompression({
        name: 'scan.jpg',
        size: encontroEuropeuImageCompressionThresholdBytes + 1,
        type: 'image/jpeg'
      } as File)
    ).toBe(true);
    expect(
      shouldOfferEncontroEuropeuImageCompression({
        name: 'scan.pdf',
        size: encontroEuropeuImageCompressionThresholdBytes + 1,
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