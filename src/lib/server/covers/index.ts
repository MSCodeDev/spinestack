import path from 'node:path';
import { dataDir } from '#lib/server/config.js';
import { createCoverStore } from './store.js';

export const coverStore = createCoverStore(path.join(dataDir, 'covers'));
export { InvalidImageError, COVER_SIZES, type CoverSize } from './store.js';
export { DownloadError, MAX_IMAGE_BYTES, downloadImage, isAllowedImageUrl } from './download.js';
