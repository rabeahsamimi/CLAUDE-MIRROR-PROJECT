// mirror.js — the "Mirror" screen: photo -> AI -> Portuguese description.
//
// The screen has 4 states, and only one is visible at a time:
//   start   -> buttons to take or choose a photo
//   loading -> the photo + "Looking…"
//   error   -> a clear message + "Try again"
//   result  -> object name, description, translation, key words, tip

import { t } from './i18n.js';
import { prepareImage } from './image.js';
import { describeImage, checkKey, listModels, fallbackModels, withRetry, GeminiError } from './gemini.js';

const $ = (selector) => document.querySelector(selector);

let currentImage = null;  // the prepared photo, kept in memory only (for "Try again")
let busy = false;

// getSettings() returns the current settings; save(changes) stores changes.
export function initMirror({ getSettings, save }) {
  const states = {
    start: $('#mirror-start'),
    loading: $('#mirror-loading'),
    error: $('#mirror-error'),
    result: $('#mirror-result'),
  };

  function show(stateName) {
    for (const [name, element] of Object.entries(states)) element.hidden = name !== stateName;
    window.scrollTo(0, 0);
  }

  // Forget the current photo and free its memory.
  function resetPhoto() {
    if (currentImage) URL.revokeObjectURL(currentImage.previewUrl);
    currentImage = null;
    $('#loading-photo').removeAttribute('src');
    $('#result-photo').removeAttribute('src');
  }

  function showError(messageKey, detail = '') {
    $('#mirror-error-text').textContent = t(messageKey, { detail });
    // The "Try again" button only makes sense if the photo itself was fine.
    $('#mirror-retry').hidden = !currentImage || messageKey === 'mirror.errorInvalid';
    $('#mirror-error-settings').hidden = messageKey !== 'mirror.errorInvalid';
    show('error');
  }

  // Shows the AI's answer. textContent is used everywhere, so even a strange
  // answer can never run code inside the app.
  function showResult(result, level) {
    $('#result-photo').src = currentImage.previewUrl;
    $('#result-level').textContent = t('mirror.levelBadge', { level });
    $('#result-object').textContent = result.objectPt;
    $('#result-object-fa').textContent = result.objectFa;
    $('#result-description').textContent = result.descriptionPt;
    $('#result-description-fa').textContent = result.descriptionFa;
    $('.result__translation').open = false;

    const list = $('#result-vocab');
    list.replaceChildren();
    for (const word of result.vocabulary) {
      const item = document.createElement('li');
      item.className = 'vocab__item';
      const pt = document.createElement('span');
      pt.className = 'vocab__pt';
      pt.lang = 'pt-BR';
      pt.dir = 'ltr';
      pt.textContent = word.pt;
      const fa = document.createElement('span');
      fa.className = 'vocab__fa';
      fa.lang = 'fa';
      fa.dir = 'rtl';
      fa.textContent = word.fa;
      item.append(pt, fa);
      list.append(item);
    }
    $('.result__subtitle').hidden = result.vocabulary.length === 0;

    $('#result-note').textContent = result.noteFa;
    $('#result-note-box').hidden = !result.noteFa;
    show('result');
  }

  // Makes sure we know which model to use (chosen once, then remembered).
  async function ensureModel(apiKey, forceRefresh = false) {
    const settings = getSettings();
    if (settings.model && !forceRefresh) return settings.model;
    const model = await checkKey(apiKey);
    save({ model });
    return model;
  }

  async function analyze() {
    const settings = getSettings();
    if (!settings.apiKey) {
      resetPhoto();
      show('start');
      return;
    }
    busy = true;
    $('#loading-photo').src = currentImage.previewUrl;
    setLoadingText('mirror.loading');
    show('loading');
    const level = settings.level;
    // One model, with automatic retries if Google is busy.
    const run = (model) => withRetry(
      () => describeImage(settings.apiKey, model, currentImage, level),
      { onRetry: () => setLoadingText('mirror.busyRetrying') },
    );
    try {
      let model = await ensureModel(settings.apiKey);
      let result;
      try {
        result = await run(model);
      } catch (error) {
        if (!(error instanceof GeminiError)) throw error;
        if (error.reason === 'notfound') {
          // Google retired or renamed the model: choose a new one and try once more.
          model = await ensureModel(settings.apiKey, true);
          result = await run(model);
        } else if (['busy', 'quota'].includes(error.reason)) {
          // Still busy after retries, or this model's free quota is used up (quotas are
          // per model): try up to 2 other free models, just for this photo.
          result = await tryOtherModels(settings.apiKey, model, level, error);
        } else {
          throw error;
        }
      }
      if (!result.recognized) showError('mirror.notRecognized');
      else showResult(result, settings.level);
    } catch (error) {
      const messages = {
        quota: 'mirror.errorQuota',
        busy: 'mirror.errorBusy',
        network: 'mirror.errorNetwork',
        invalid: 'mirror.errorInvalid',
        forbidden: 'mirror.errorInvalid',
        blocked: 'mirror.errorBlocked',
        badresponse: 'mirror.errorBadResponse',
      };
      const reason = error instanceof GeminiError ? error.reason : 'unknown';
      showError(messages[reason] || 'mirror.errorUnknown', error?.message || reason);
    } finally {
      busy = false;
    }
  }

  function setLoadingText(key) {
    $('#loading-text').textContent = t(key);
  }

  async function tryOtherModels(apiKey, busyModel, level, originalError) {
    const others = fallbackModels(await listModels(apiKey), busyModel).slice(0, 2);
    for (const model of others) {
      setLoadingText('mirror.tryingOtherModel');
      try {
        return await describeImage(apiKey, model, currentImage, level);
      } catch (error) {
        const tryNext = error instanceof GeminiError && ['busy', 'quota', 'notfound'].includes(error.reason);
        if (!tryNext) throw error;
      }
    }
    throw originalError;
  }

  async function onFileChosen(event) {
    const input = event.target;
    const file = input.files?.[0];
    input.value = ''; // so choosing the same photo again still works
    if (!file || busy) return;
    resetPhoto();
    try {
      currentImage = await prepareImage(file);
    } catch {
      showError('mirror.errorImage');
      return;
    }
    analyze();
  }

  function newPhoto() {
    resetPhoto();
    show('start');
  }

  $('#camera-input').addEventListener('change', onFileChosen);
  $('#library-input').addEventListener('change', onFileChosen);
  $('#mirror-retry').addEventListener('click', () => { if (currentImage && !busy) analyze(); });
  $('#mirror-new').addEventListener('click', newPhoto);
  $('#mirror-error-new').addEventListener('click', newPhoto);

  // Called whenever the Mirror screen is shown.
  return {
    update() {
      const hasKey = Boolean(getSettings().apiKey);
      $('#mirror-need-key').hidden = hasKey;
      for (const id of ['#camera-input', '#library-input']) $(id).disabled = !hasKey;
      for (const id of ['#capture-label', '#library-label']) $(id).classList.toggle('is-disabled', !hasKey);
    },
  };
}
