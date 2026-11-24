// gemini.js — talks to the Google Gemini API (the AI "brain" of the app).
//
// The browser calls Google directly with the key saved on this phone.
// There is no server of our own in the middle, so the key never leaves
// the phone except to go to Google itself.
//
// Stage 2 only needs one thing: check that a key works and choose a model.
// Later stages add image description, conversation and corrections here.

export const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// Models we prefer, best first. "Flash-Lite" models have the biggest free
// daily quota and accept images and audio, which is exactly what we need.
// The list is checked against the models your key can really use, so if
// Google renames or retires a model, the app picks the next one by itself.
export const PREFERRED_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash-lite',
];

const TIMEOUT_MS = 20000;

// A small error type so the rest of the app knows WHAT went wrong.
// reason is one of: 'invalid', 'quota', 'forbidden', 'network', 'nomodel', 'unknown'
export class GeminiError extends Error {
  constructor(reason, detail = '') {
    super(detail || reason);
    this.name = 'GeminiError';
    this.reason = reason;
    this.detail = detail;
  }
}

// Sends one request to Gemini and returns the JSON answer, or throws GeminiError.
async function request(path, apiKey, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetch(`${API_BASE}/${path}`, {
      ...options,
      // The key goes in a header (not in the URL), as Google's REST docs recommend.
      headers: { 'x-goog-api-key': apiKey, ...(options.headers || {}) },
      signal: controller.signal,
    });
  } catch (error) {
    // fetch() itself fails when there is no internet, on timeout, or if the
    // browser blocks the request.
    throw new GeminiError('network', error?.name === 'AbortError' ? 'timeout' : String(error?.message || error));
  } finally {
    clearTimeout(timer);
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (response.ok) return body;
  throw errorFromResponse(response.status, body);
}

// Turns an HTTP error from Google into a GeminiError with a clear reason.
export function errorFromResponse(status, body) {
  const message = body?.error?.message || `HTTP ${status}`;
  const reasons = (body?.error?.details || []).map((d) => d?.reason).filter(Boolean);

  if (reasons.includes('API_KEY_INVALID') || status === 401) return new GeminiError('invalid', message);
  if (status === 400 && /api key/i.test(message)) return new GeminiError('invalid', message);
  if (status === 429) return new GeminiError('quota', message);
  if (status === 403) return new GeminiError('forbidden', message);
  return new GeminiError('unknown', message);
}

// Lists the model names this key may use for generating content.
export async function listModels(apiKey) {
  const names = [];
  let pageToken = '';
  // Google returns models in pages; we follow up to 5 pages to be safe.
  for (let page = 0; page < 5; page += 1) {
    const query = new URLSearchParams({ pageSize: '100' });
    if (pageToken) query.set('pageToken', pageToken);
    const body = await request(`models?${query}`, apiKey, { method: 'GET' });
    for (const model of body?.models || []) {
      const methods = model.supportedGenerationMethods || [];
      if (methods.includes('generateContent')) {
        names.push(String(model.name || '').replace(/^models\//, ''));
      }
    }
    pageToken = body?.nextPageToken || '';
    if (!pageToken) break;
  }
  return names;
}

// Chooses the best model from those available.
// Order: our preferred list, then any other Flash-Lite, then any Flash.
export function pickModel(available) {
  for (const name of PREFERRED_MODELS) {
    if (available.includes(name)) return name;
  }
  const usable = available.filter((name) => name.startsWith('gemini-') && !/(tts|image|embedding|live|audio)/.test(name));
  return usable.find((name) => name.includes('flash-lite'))
      || usable.find((name) => name.includes('flash'))
      || null;
}

// Checks that a key works and returns the chosen model name.
export async function checkKey(apiKey) {
  const available = await listModels(apiKey);
  const model = pickModel(available);
  if (!model) throw new GeminiError('nomodel');
  return model;
}
