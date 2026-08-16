// User guide — language preference and "already seen" state.
//
// The application interface itself is English. The guide is bilingual
// (German / English) because the client's staff work in German, while the
// repository and the thesis are English. The language is a single global
// preference, shared by the guided tours and the reference panel.

export type GuideLang = 'de' | 'en';
export type TourId = 'home' | 'editor';

const LANG_KEY = 'vt_guide_lang';
const SEEN_KEY = 'vt_guide_seen';

let _lang = $state<GuideLang>('de');
let _seen = $state<string[]>([]);
let _loaded = false;

/** Read the stored preferences. Safe to call more than once. */
export function initGuide(): void {
  if (_loaded || typeof localStorage === 'undefined') return;
  _loaded = true;
  const stored = localStorage.getItem(LANG_KEY);
  if (stored === 'de' || stored === 'en') {
    _lang = stored;
  } else {
    // First visit: follow the browser, but default to German for the client.
    _lang = navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'de';
  }
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    _seen = raw ? JSON.parse(raw) : [];
  } catch {
    _seen = [];
  }
}

export function getGuideLang(): GuideLang {
  return _lang;
}

export function setGuideLang(lang: GuideLang): void {
  _lang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* private mode — the choice simply does not persist */
  }
}

export function toggleGuideLang(): void {
  setGuideLang(_lang === 'de' ? 'en' : 'de');
}

/** True while a tour has never been completed or skipped on this browser. */
export function tourSeen(id: TourId): boolean {
  return _seen.includes(id);
}

export function markTourSeen(id: TourId): void {
  if (_seen.includes(id)) return;
  _seen = [..._seen, id];
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(_seen));
  } catch {
    /* ignore */
  }
}

/** Used by the "show the tour again" button in the help panel. */
export function resetTour(id: TourId): void {
  _seen = _seen.filter((s) => s !== id);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(_seen));
  } catch {
    /* ignore */
  }
}
