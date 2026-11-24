// ai.js — one place that connects the screens to Gemini.
//
// Every screen (Mirror, pronunciation practice, and later the conversation)
// needs the same things: the saved key, the chosen model, retries when Google
// is busy, and a clear message when something fails. They all live here.

import { checkKey, runWithFallback, GeminiError } from './gemini.js';

// Which message (from i18n.js) to show for each kind of error.
const ERROR_MESSAGES = {
  quota: 'mirror.errorQuota',
  busy: 'mirror.errorBusy',
  network: 'mirror.errorNetwork',
  invalid: 'mirror.errorInvalid',
  forbidden: 'mirror.errorInvalid',
  blocked: 'mirror.errorBlocked',
  badresponse: 'mirror.errorBadResponse',
};

export function errorMessageKey(error) {
  const reason = error instanceof GeminiError ? error.reason : 'unknown';
  return ERROR_MESSAGES[reason] || 'mirror.errorUnknown';
}

export function createAi({ getSettings, save }) {
  // The model is chosen once (from the models the key can use) and remembered.
  async function ensureModel(force) {
    const settings = getSettings();
    if (settings.model && !force) return settings.model;
    const model = await checkKey(settings.apiKey);
    save({ model });
    return model;
  }

  return {
    hasKey: () => Boolean(getSettings().apiKey),

    // task(apiKey, model) does the actual request, e.g. describeImage(...).
    run(task, onStatus) {
      const { apiKey } = getSettings();
      return runWithFallback({ apiKey, ensureModel, task: (model) => task(apiKey, model), onStatus });
    },
  };
}
