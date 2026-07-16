// Progress of the runtime catalogue-preview generation.
// Written by preloadCatalogThumbnails(), read by the editor loading
// overlay and by BuildPanel (for tile re-render as previews complete).
import { writable } from 'svelte/store';

export interface ThumbnailProgress {
  done: number;
  total: number;
  finished: boolean;
}

export const thumbnailProgress = writable<ThumbnailProgress>({
  done: 0,
  total: 0,
  finished: false,
});

/** Bumped each time a top-down canvas image finishes rendering,
 *  so the 2D canvas knows to redraw. */
export const topdownVersion = writable(0);