// settings.js — saves and loads the user's settings on this phone only.
//
// We use localStorage: a small key/value store inside the browser.
// Data stays on the device; it is never sent anywhere by this file.
// Every access is wrapped in try/catch because Safari can block storage
// (for example in Private Browsing), and the app must keep working anyway.

const STORAGE_KEY = 'espelho.settings.v1';

// Default values, used the first time the app opens.
export const DEFAULT_SETTINGS = Object.freeze({
  apiKey: '',          // Gemini API key (only on this device)
  model: '',           // Gemini model chosen automatically after "Test key"
  level: 'A1',         // Portuguese level: A1, A2 or B1
  uiLang: 'fa',        // Interface language: 'fa' (Persian) or 'pt' (Portuguese)
  theme: 'auto',       // 'auto' follows the iPhone setting; or 'light' / 'dark'
  onboarded: false,    // true after the welcome screen was seen once
});

const ALLOWED = {
  level: ['A1', 'A2', 'B1'],
  uiLang: ['fa', 'pt'],
  theme: ['auto', 'light', 'dark'],
};

// Reads settings from storage and fixes any bad or missing values.
export function loadSettings() {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
  } catch {
    saved = {};
  }
  const settings = { ...DEFAULT_SETTINGS, ...saved };
  for (const [name, values] of Object.entries(ALLOWED)) {
    if (!values.includes(settings[name])) settings[name] = DEFAULT_SETTINGS[name];
  }
  if (typeof settings.apiKey !== 'string') settings.apiKey = '';
  if (typeof settings.model !== 'string') settings.model = '';
  settings.onboarded = settings.onboarded === true;
  return settings;
}

// Saves a change (for example { level: 'A2' }) and returns the new settings.
// Returns null if the browser refused to save.
export function saveSettings(changes) {
  const next = { ...loadSettings(), ...changes };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return null;
  }
}

// Gemini keys look like "AIza" + 35 letters/numbers/-/_ (39 characters).
// We only warn on a clearly wrong format; Google decides if a key is really valid.
export function looksLikeGeminiKey(key) {
  return /^AIza[0-9A-Za-z_-]{30,}$/.test(key);
}
