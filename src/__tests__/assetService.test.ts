import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  sanitizeFileName, 
  isVideoEmbedUrl, 
  getYoutubeEmbedUrl,
  saveAsset,
  resolveAssetUrl
} from '../services/assetService';

describe('Asset Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sanitizes filenames cleanly for the assets folder', () => {
    expect(sanitizeFileName('My Photo (1).png')).toBe('My_Photo__1_.png');
    expect(sanitizeFileName('test/path\\name?.jpg')).toBe('test_path_name_.jpg');
    expect(sanitizeFileName('simple-doc.pdf')).toBe('simple-doc.pdf');
  });

  it('identifies video embed links accurately', () => {
    expect(isVideoEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(isVideoEmbedUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(isVideoEmbedUrl('https://vimeo.com/12345678')).toBe(true);
    expect(isVideoEmbedUrl('https://example.com/assets/video.mp4')).toBe(false);
  });

  it('transforms YouTube and Vimeo URLs into proper embed URLs', () => {
    const standard = getYoutubeEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(standard).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');

    const short = getYoutubeEmbedUrl('https://youtu.be/dQw4w9WgXcQ');
    expect(short).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');

    const vimeo = getYoutubeEmbedUrl('https://vimeo.com/123456');
    expect(vimeo).toBe('https://player.vimeo.com/video/123456');

    const alreadyEmbed = getYoutubeEmbedUrl('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(alreadyEmbed).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
  });

  it('returns external URLs as-is in resolveAssetUrl', async () => {
    const webUrl = 'https://images.unsplash.com/photo-1547756536';
    const resolved = await resolveAssetUrl(webUrl);
    expect(resolved).toBe(webUrl);

    const dataUri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
    const resolvedData = await resolveAssetUrl(dataUri);
    expect(resolvedData).toBe(dataUri);
  });

  it('saves an asset and returns an assets/ relative path', async () => {
    const fakeBlob = new Blob(['sample-image-content'], { type: 'image/png' });
    const result = await saveAsset(fakeBlob, 'test-chart.png');

    expect(result).toBeDefined();
    expect(result.assetPath).toMatch(/^assets\/asset-\d+-test-chart\.png$/);
    expect(result.resolvedUrl).toBeDefined();
  });
});
