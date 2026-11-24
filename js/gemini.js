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

const TIMEOUT_MS = 45000; // photos on a slow mobile connection can take a while

// A small error type so the rest of the app knows WHAT went wrong.
// reason is one of: 'invalid', 'quota', 'forbidden', 'network', 'nomodel', 'notfound',
//                   'busy' (Google servers overloaded, temporary), 'blocked' (safety filter),
//                   'badresponse' (answer was not usable), 'unknown'
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
  // 500/502/503/504 = a problem on Google's side, usually "high demand". It is temporary.
  if ([500, 502, 503, 504].includes(status) || /high demand|overloaded|try again later/i.test(message)) {
    return new GeminiError('busy', message);
  }
  if (status === 429) return new GeminiError('quota', message);
  if (status === 403) return new GeminiError('forbidden', message);
  if (status === 404) return new GeminiError('notfound', message); // model renamed or retired
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

// Other models to try, in order, when `current` is busy.
// Same preference rules as pickModel, without the current model.
export function fallbackModels(available, current) {
  const usable = available.filter((name) => name.startsWith('gemini-') && !/(tts|image|embedding|live|audio)/.test(name));
  const ordered = [
    ...PREFERRED_MODELS.filter((name) => available.includes(name)),
    ...usable.filter((name) => name.includes('flash-lite')),
    ...usable.filter((name) => name.includes('flash') && !name.includes('flash-lite')),
  ];
  return [...new Set(ordered)].filter((name) => name !== current);
}

// Waits a number of milliseconds (used between retries).
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Runs `task`; if Google says it is busy, waits and tries again.
// delays = how long to wait before each new try (here: 1.5 s, then 4 s).
// onRetry(tryNumber) lets the screen tell the user what is happening.
export async function withRetry(task, { delays = [1500, 4000], onRetry } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      const canRetry = error instanceof GeminiError && error.reason === 'busy' && attempt < delays.length;
      if (!canRetry) throw error;
      onRetry?.(attempt + 1);
      await wait(delays[attempt]);
    }
  }
}

// Checks that a key works and returns the chosen model name.
export async function checkKey(apiKey) {
  const available = await listModels(apiKey);
  const model = pickModel(available);
  if (!model) throw new GeminiError('nomodel');
  return model;
}

// ---------------------------------------------------------------------------
// Stage 3: describe a photo in Portuguese
// ---------------------------------------------------------------------------

// What each level means, in words the AI understands well (CEFR levels).
export const LEVEL_GUIDE = {
  A1: 'CEFR A1 (absolute beginner): 2 or 3 very short sentences, present tense only, the most common everyday words, no idioms.',
  A2: 'CEFR A2 (elementary): 3 or 4 short sentences, present tense and simple past (pretérito perfeito), simple connectors like "e", "mas", "porque".',
  B1: 'CEFR B1 (intermediate): 4 or 5 sentences, natural everyday Brazilian Portuguese, can include an opinion, a comparison or a common expression.',
};

// The "system instruction" tells the AI who it is and what rules to follow.
function tutorInstruction(level) {
  return [
    'You are a warm, patient Brazilian Portuguese tutor for a Persian-speaking adult who lives in Porto Alegre, Brazil.',
    'The student sends a photo of something from daily life. Identify the MAIN object and teach Brazilian Portuguese (pt-BR) about it.',
    `Student level: ${LEVEL_GUIDE[level] || LEVEL_GUIDE.A1}`,
    'Rules:',
    '- Use Brazilian Portuguese only (not European Portuguese): e.g. "celular", "ônibus", "geladeira".',
    '- Always give nouns with their article ("a caneca", "o garfo") so the student learns the gender.',
    '- Persian text must be natural Persian in Persian script.',
    '- If the photo is too dark, blurry, or has no clear object, set "recognized" to false and leave the other text fields empty.',
    '- If a person is visible, do not identify or describe them; focus on an object. If a document or screen with personal data is visible, never copy its text.',
    '- The "note_fa" is one short, useful tip in Persian (grammar, pronunciation or Brazilian culture) about this object or its words.',
  ].join('\n');
}

// The exact shape of the answer we want back (Gemini "structured output").
// Asking for JSON makes the answer predictable and easy for the app to show.
const DESCRIPTION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    recognized: { type: 'BOOLEAN' },
    object_pt: { type: 'STRING', description: 'Name of the main object in pt-BR, with article' },
    object_fa: { type: 'STRING', description: 'Name of the object in Persian' },
    description_pt: { type: 'STRING', description: 'Description at the student level, in pt-BR' },
    description_fa: { type: 'STRING', description: 'Persian translation of description_pt' },
    vocabulary: {
      type: 'ARRAY',
      description: '3 to 5 useful words from the description',
      items: {
        type: 'OBJECT',
        properties: {
          pt: { type: 'STRING', description: 'Word in pt-BR (nouns with article)' },
          fa: { type: 'STRING', description: 'Persian meaning' },
        },
        required: ['pt', 'fa'],
      },
    },
    note_fa: { type: 'STRING' },
  },
  required: ['recognized', 'object_pt', 'object_fa', 'description_pt', 'description_fa', 'vocabulary', 'note_fa'],
};

// Reads the text out of a Gemini answer, or explains why there is none.
export function extractText(body) {
  if (body?.promptFeedback?.blockReason) throw new GeminiError('blocked', body.promptFeedback.blockReason);
  const candidate = body?.candidates?.[0];
  if (!candidate) throw new GeminiError('badresponse', 'no candidates');
  if (['SAFETY', 'PROHIBITED_CONTENT', 'BLOCKLIST', 'SPII', 'IMAGE_SAFETY'].includes(candidate.finishReason)) {
    throw new GeminiError('blocked', candidate.finishReason);
  }
  const text = (candidate.content?.parts || [])
    .filter((part) => typeof part.text === 'string' && !part.thought)
    .map((part) => part.text)
    .join('');
  if (!text) throw new GeminiError('badresponse', candidate.finishReason || 'empty');
  return text;
}

// Never trust data blindly, even from Google: check every field and keep it short.
function cleanText(value, max = 1200) {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}
export function cleanDescription(raw) {
  const result = {
    recognized: raw?.recognized === true,
    objectPt: cleanText(raw?.object_pt, 120),
    objectFa: cleanText(raw?.object_fa, 120),
    descriptionPt: cleanText(raw?.description_pt),
    descriptionFa: cleanText(raw?.description_fa),
    vocabulary: (Array.isArray(raw?.vocabulary) ? raw.vocabulary : [])
      .map((item) => ({ pt: cleanText(item?.pt, 80), fa: cleanText(item?.fa, 80) }))
      .filter((item) => item.pt && item.fa)
      .slice(0, 6),
    noteFa: cleanText(raw?.note_fa, 500),
  };
  if (result.recognized && (!result.objectPt || !result.descriptionPt)) result.recognized = false;
  return result;
}

// Sends the photo to Gemini and returns a clean description object.
// image = { base64, mimeType }  (base64 = the photo as text, without "data:..." prefix)
export async function describeImage(apiKey, model, image, level) {
  const body = {
    systemInstruction: { parts: [{ text: tutorInstruction(level) }] },
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: image.mimeType, data: image.base64 } },
        { text: `Describe the main object for a ${level} student. Answer only with the JSON.` },
      ],
    }],
    generationConfig: {
      temperature: 0.4,            // lower = more careful and consistent
      maxOutputTokens: 2048,
      responseMimeType: 'application/json',
      responseSchema: DESCRIPTION_SCHEMA,
    },
  };
  const answer = await request(`models/${encodeURIComponent(model)}:generateContent`, apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  let parsed;
  try {
    parsed = JSON.parse(extractText(answer));
  } catch (error) {
    if (error instanceof GeminiError) throw error;
    throw new GeminiError('badresponse', 'invalid JSON');
  }
  return cleanDescription(parsed);
}
