import { afterEach, describe, expect, it, vi } from 'vitest';
import { prepareProductImage } from './product-image-upload';

afterEach(() => vi.unstubAllGlobals());

describe('product image upload preparation', () => {
  it('bounds large photos while preserving their aspect ratio and releasing the bitmap', async () => {
    const bitmap = { width: 4000, height: 3000, close: vi.fn() };
    const drawImage = vi.fn();
    const canvas = { getContext: () => ({ drawImage }), toBlob: done => done(new Blob(['webp'], { type: 'image/webp' })) };
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    vi.stubGlobal('document', { createElement: () => canvas });
    const input = new File(['large original photo'], 'mango.png', { type: 'image/png' });
    const result = await prepareProductImage(input);
    expect([canvas.width, canvas.height]).toEqual([1600, 1200]);
    expect(result.type).toBe('image/webp');
    expect(result.size).toBeLessThan(input.size);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it('keeps the original if conversion is larger', async () => {
    const bitmap = { width: 100, height: 50, close: vi.fn() };
    const canvas = { getContext: () => ({ drawImage: vi.fn() }), toBlob: done => done(new Blob(['larger output'], { type: 'image/webp' })) };
    vi.stubGlobal('createImageBitmap', vi.fn(async () => bitmap));
    vi.stubGlobal('document', { createElement: () => canvas });
    const input = new File(['tiny'], 'small.webp', { type: 'image/webp' });
    expect(await prepareProductImage(input)).toBe(input);
    expect([canvas.width, canvas.height]).toEqual([100, 50]);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it('keeps uploads working when browser image optimization is unsupported', async () => {
    vi.stubGlobal('createImageBitmap', undefined);
    const input = new File(['original'], 'mango.png', { type: 'image/png' });
    expect(await prepareProductImage(input)).toBe(input);
  });
});
