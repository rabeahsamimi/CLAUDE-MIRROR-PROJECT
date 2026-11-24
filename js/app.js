// app.js — the starting point of the app. It connects everything:
//   1. loads the saved settings,
//   2. applies language and theme,
//   3. shows the right screen for the URL (#mirror, #review, #progress, #settings),
//   4. reacts to buttons on the Settings screen.

import { applyLanguage, t } from './i18n.js';
import { loadSettings, saveSettings, isPlausibleKey } from './settings.js';
import { checkKey, GeminiError } from './gemini.js';
import { initMirror } from './mirror.js';

export const APP_VERSION = '0.3.1'; // stage 3 + fix: retry and switch model when Google is busy

const SCREENS = ['mirror', 'review', 'progress', 'settings'];
let settings = loadSettings();
let mirror = null; // the Mirror screen controller (js/mirror.js)

// A shortcut: $('#id') finds one element on the page.
const $ = (selector) => document.querySelector(selector);

// ---------- Theme (light / dark) ----------
function applyTheme(theme) {
  const html = document.documentElement;
  if (theme === 'auto') delete html.dataset.theme; // follow the iPhone setting
  else html.dataset.theme = theme;

  // Color of the iPhone status bar area, matched to the page background.
  const dark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  $('meta[name="theme-color"]').setAttribute('content', dark ? '#101613' : '#f6f8f5');
}

// ---------- Navigation between screens ----------
function currentScreen() {
  const name = location.hash.replace('#', '');
  return SCREENS.includes(name) ? name : 'mirror';
}

function showScreen(name) {
  document.querySelectorAll('.screen').forEach((section) => {
    section.hidden = section.dataset.screen !== name;
  });
  document.querySelectorAll('.tabbar__item').forEach((tab) => {
    if (tab.dataset.tab === name) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  if (name === 'mirror') updateMirrorScreen();
  window.scrollTo(0, 0);
}

function updateMirrorScreen() {
  mirror?.update();
}

// ---------- Status messages ----------
// kind: 'info' | 'ok' | 'error'
// code: optional technical text (like a model name), shown left-to-right in a box.
function setStatus(text, kind = 'info', code = '') {
  const status = $('#key-status');
  status.textContent = text;
  status.dataset.kind = kind;
  if (code) {
    const codeElement = document.createElement('code');
    codeElement.dir = 'ltr';
    codeElement.textContent = code;
    status.append(' ', codeElement);
  }
}

// ---------- Settings screen ----------
function fillSettingsForm() {
  $('#api-key').value = settings.apiKey;
  for (const name of ['level', 'uiLang', 'theme']) {
    const input = document.querySelector(`input[name="${name}"][value="${settings[name]}"]`);
    if (input) input.checked = true;
  }
  $('#app-version').textContent = t('app.version', { version: APP_VERSION });
}

function updateToggleLabel() {
  const visible = $('#api-key').type === 'text';
  const button = $('#toggle-key');
  button.textContent = t(visible ? 'settings.hide' : 'settings.show');
  button.setAttribute('aria-pressed', String(visible));
}

function save(changes) {
  const next = saveSettings(changes);
  if (next) settings = next;
  return Boolean(next);
}

function wireSettings() {
  $('#toggle-key').addEventListener('click', () => {
    const input = $('#api-key');
    input.type = input.type === 'password' ? 'text' : 'password';
    updateToggleLabel();
  });

  $('#save-key').addEventListener('click', () => {
    // trim() removes spaces that iPhone copy/paste sometimes adds.
    const key = $('#api-key').value.trim();
    $('#api-key').value = key;
    if (!key) return setStatus(t('settings.empty'), 'error');
    if (!isPlausibleKey(key)) return setStatus(t('settings.badFormat'), 'error');
    // A new key may have different models, so we forget the old choice.
    if (!save({ apiKey: key, model: key === settings.apiKey ? settings.model : '' })) {
      return setStatus(t('settings.testError', { detail: 'storage' }), 'error');
    }
    setStatus(t('settings.saved'), 'ok');
  });

  $('#test-key').addEventListener('click', async () => {
    const key = $('#api-key').value.trim();
    if (!key) return setStatus(t('settings.empty'), 'error');
    const button = $('#test-key');
    button.disabled = true;
    setStatus(t('settings.testing'));
    try {
      const model = await checkKey(key);
      save({ apiKey: key, model });
      setStatus(t('settings.testOk'), 'ok', model);
    } catch (error) {
      const reason = error instanceof GeminiError ? error.reason : 'unknown';
      const messages = {
        invalid: 'settings.testInvalid',
        quota: 'settings.testQuota',
        busy: 'settings.testBusy',
        forbidden: 'settings.testForbidden',
        network: 'settings.testNetwork',
        nomodel: 'settings.testNoModel',
      };
      setStatus(t(messages[reason] || 'settings.testError', { detail: error?.message || reason }), 'error');
    } finally {
      button.disabled = false;
    }
  });

  $('#delete-key').addEventListener('click', () => {
    save({ apiKey: '', model: '' });
    $('#api-key').value = '';
    setStatus(t('settings.deleted'), 'ok');
  });

  // Radio buttons: save as soon as the choice changes.
  document.querySelectorAll('input[name="level"]').forEach((input) => {
    input.addEventListener('change', () => save({ level: input.value }));
  });
  document.querySelectorAll('input[name="theme"]').forEach((input) => {
    input.addEventListener('change', () => {
      save({ theme: input.value });
      applyTheme(settings.theme);
    });
  });
  document.querySelectorAll('input[name="uiLang"]').forEach((input) => {
    input.addEventListener('change', () => {
      save({ uiLang: input.value });
      applyLanguage(settings.uiLang);
      fillSettingsForm();
      updateToggleLabel();
      setStatus('');
    });
  });

  // If the iPhone switches between light and dark, follow it in "auto" mode.
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => applyTheme(settings.theme));
}

// ---------- Welcome dialog (first run only) ----------
function showWelcomeIfNeeded() {
  if (settings.onboarded) return;
  const dialog = $('#welcome');
  $('#welcome-start').addEventListener('click', () => {
    save({ onboarded: true });
    dialog.close();
    location.hash = settings.apiKey ? '#mirror' : '#settings';
  }, { once: true });
  dialog.showModal();
}

// ---------- Start ----------
function start() {
  applyLanguage(settings.uiLang);
  applyTheme(settings.theme);
  fillSettingsForm();
  updateToggleLabel();
  wireSettings();
  mirror = initMirror({ getSettings: () => settings, save });
  window.addEventListener('hashchange', () => showScreen(currentScreen()));
  showScreen(currentScreen());
  document.body.classList.add('is-ready');
  showWelcomeIfNeeded();
}

start();
