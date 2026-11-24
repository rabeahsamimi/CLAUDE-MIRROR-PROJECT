// mirror.js — the "Mirror" screen: photo -> AI -> Portuguese description.
//
// The screen has 4 states, and only one is visible at a time:
//   start   -> buttons to take or choose a photo
//   loading -> the photo + "Looking…"
//   error   -> a clear message + "Try again"
//   result  -> object name, description, translation, key words, tip,
//              listen buttons (🔊) and pronunciation practice (🎤)

import { t } from './i18n.js';
import { prepareImage } from './image.js';
import { describeImage } from './gemini.js';
import { errorMessageKey } from './ai.js';
import { speak, stopSpeaking } from './speech.js';
import { initPractice } from './practice.js';

const $ = (selector) => document.querySelector(selector);

let currentImage = null;  // the prepared photo, kept in memory only (for "Try again")
let busy = false;

// Creates a small round 🔊 button that reads `text` aloud.
function listenButton(text, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'icon-button';
  button.setAttribute('aria-label', label);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 64 64');
  svg.setAttribute('aria-hidden', 'true');
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', '#icon-speaker');
  svg.append(use);
  button.append(svg);
  button.addEventListener('click', () => speak(text, { button }));
  return button;
}

// getSettings() returns the current settings; ai = the shared AI helper (js/ai.js).
export function initMirror({ getSettings, ai }) {
  const practice = initPractice({ ai });
  let shownResult = null;
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
    practice.reset();
    stopSpeaking();
    shownResult = null;
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
      item.append(listenButton(word.pt, t('speak.listen')), pt, fa);
      list.append(item);
    }
    $('.result__subtitle').hidden = result.vocabulary.length === 0;

    $('#result-note').textContent = result.noteFa;
    $('#result-note-box').hidden = !result.noteFa;
    shownResult = result;
    practice.setTargets(result);
    show('result');
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
    const { level } = settings;
    try {
      // ai.run handles retries when Google is busy and switching models if needed.
      const result = await ai.run(
        (apiKey, model) => describeImage(apiKey, model, currentImage, level),
        (status) => setLoadingText(status === 'busy' ? 'mirror.busyRetrying' : 'mirror.tryingOtherModel'),
      );
      if (!result.recognized) showError('mirror.notRecognized');
      else showResult(result, level);
    } catch (error) {
      showError(errorMessageKey(error), error?.message || '');
    } finally {
      busy = false;
    }
  }

  function setLoadingText(key) {
    $('#loading-text').textContent = t(key);
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
  $('#listen-object').addEventListener('click', (event) => speak(shownResult?.objectPt, { button: event.currentTarget }));
  $('#listen-description').addEventListener('click', (event) => speak(shownResult?.descriptionPt, { button: event.currentTarget }));
  $('#listen-description-slow').addEventListener('click', (event) => speak(shownResult?.descriptionPt, { slow: true, button: event.currentTarget }));

  // Called whenever the Mirror screen is shown.
  return {
    // Called when another screen is opened: stop sound and recording.
    leave() {
      practice.reset();
      stopSpeaking();
    },
    update() {
      const hasKey = Boolean(getSettings().apiKey);
      $('#mirror-need-key').hidden = hasKey;
      for (const id of ['#camera-input', '#library-input']) $(id).disabled = !hasKey;
      for (const id of ['#capture-label', '#library-label']) $(id).classList.toggle('is-disabled', !hasKey);
    },
  };
}
