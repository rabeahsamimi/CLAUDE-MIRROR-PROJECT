// practice.js — "Pronunciation practice" inside the result card.
//
// Flow: the app shows a word or sentence -> you listen (🔊) -> you tap the
// microphone and say it -> the AI writes what it heard and gives feedback in Persian.
//
// Two kinds of feedback, on purpose:
//   1. Word check (done on the phone, objective): which target words were heard.
//   2. AI feedback (subjective): a verdict and tips for specific sounds.

import { t } from './i18n.js';
import { speak, stopSpeaking } from './speech.js';
import { isRecordingSupported, startRecording, toWav, MAX_SECONDS } from './recorder.js';
import { transcribeSpeech, pronunciationFeedback } from './gemini.js';
import { errorMessageKey } from './ai.js';

const $ = (selector) => document.querySelector(selector);

// Makes words comparable: lower case, no accents, no punctuation.
// "Está" and "esta" count as the same word here (accents are checked by the AI).
export function normalizeWords(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// For each target word: was it heard? Returns [{ word, ok }] (word keeps its original spelling).
export function compareWords(target, heard) {
  const pool = normalizeWords(heard);
  return target.split(/\s+/).filter(Boolean).map((word) => {
    const key = normalizeWords(word)[0];
    if (!key) return { word, ok: true }; // punctuation only
    const index = pool.indexOf(key);
    if (index >= 0) pool.splice(index, 1); // each heard word counts once
    return { word, ok: index >= 0 };
  });
}

// The phone's own check is the final word on the verdict: if target words were
// not heard, the result can never be "good", whatever the AI said.
export function combineVerdict(aiVerdict, comparison) {
  const counted = comparison.filter((item) => normalizeWords(item.word).length > 0);
  const missing = counted.filter((item) => !item.ok).length;
  if (missing === 0) return aiVerdict;
  if (missing * 2 > counted.length) return 'retry';
  return aiVerdict === 'retry' ? 'retry' : 'close';
}

// Splits a description into sentences.
export function splitSentences(text) {
  return text.split(/(?<=[.!?…])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

export function initPractice({ ai }) {
  let targets = [];
  let index = 0;
  let recording = null;     // the running recorder, while recording
  let tickTimer = null;
  let playbackUrl = '';     // your own recording, to listen back
  let checking = false;
  let starting = false;     // true while the microphone is starting up
  let session = 0;          // changes on reset, so a slow-starting mic knows it is no longer wanted

  function setStatus(text, kind = 'info') {
    const status = $('#practice-status');
    status.textContent = text;
    status.dataset.kind = kind;
  }

  function clearResult() {
    $('#practice-result').hidden = true;
    if (playbackUrl) URL.revokeObjectURL(playbackUrl);
    playbackUrl = '';
    $('#practice-audio').removeAttribute('src');
    setStatus('');
  }

  function showTarget() {
    const target = targets[index] || '';
    $('#practice-target').textContent = target;
    $('#practice-counter').textContent = t('practice.counter', { n: index + 1, total: targets.length });
    $('#practice-prev').disabled = index === 0;
    $('#practice-next').disabled = index >= targets.length - 1;
    clearResult();
  }

  function setRecordButton(isRecording, seconds = 0) {
    const button = $('#practice-record');
    button.classList.toggle('is-recording', isRecording);
    button.setAttribute('aria-pressed', String(isRecording));
    $('#practice-record-label').textContent = isRecording
      ? t('practice.stop', { seconds: Math.max(0, MAX_SECONDS - seconds) })
      : t('practice.record');
  }

  function showFeedback(result, target) {
    const comparison = compareWords(target, result.heardPt);
    const verdictKind = combineVerdict(result.verdict, comparison);
    const words = $('#practice-words');
    words.replaceChildren();
    for (const { word, ok } of comparison) {
      const span = document.createElement('span');
      span.className = ok ? 'word word--ok' : 'word word--miss';
      span.textContent = word;
      words.append(span, ' ');
    }
    const verdict = $('#practice-verdict');
    verdict.dataset.kind = verdictKind;
    verdict.textContent = t(`practice.verdict.${verdictKind}`);
    $('#practice-heard').textContent = result.heardPt || '—';
    $('#practice-feedback').textContent = result.feedbackFa;
    const tips = $('#practice-tips');
    tips.replaceChildren();
    for (const tip of result.tips) {
      const item = document.createElement('li');
      const word = document.createElement('strong');
      word.lang = 'pt-BR';
      word.dir = 'ltr';
      word.textContent = tip.word;
      item.append(word, ': ', tip.tipFa);
      tips.append(item);
    }
    // If the AI gave no tip but words were missed, at least name those words.
    const missed = comparison.filter((item) => !item.ok).map((item) => item.word);
    if (result.tips.length === 0 && missed.length) {
      const item = document.createElement('li');
      item.textContent = t('practice.missedWords', { words: missed.join(' ') });
      tips.append(item);
    }
    tips.hidden = tips.children.length === 0;
    $('#practice-audio').src = playbackUrl;
    $('#practice-result').hidden = false;
    setStatus('');
  }

  async function finishRecording() {
    clearInterval(tickTimer);
    const current = recording;
    recording = null;
    setRecordButton(false);
    if (!current) return;
    const { blob, seconds } = await current.stop();
    const target = targets[index];

    checking = true;
    $('#practice-record').disabled = true;
    setStatus(t('practice.checking'));
    try {
      if (seconds < 0.5 || blob.size === 0) {
        setStatus(t('practice.noSpeech'), 'error');
        return;
      }
      const audio = await toWav(blob);
      if (audio.peak < 0.02) {
        // Nearly silent: do not spend quota on it.
        setStatus(t('practice.noSpeech'), 'error');
        return;
      }
      playbackUrl = URL.createObjectURL(blob);
      const onStatus = (status) => setStatus(t(status === 'busy' ? 'mirror.busyRetrying' : 'mirror.tryingOtherModel'));
      // Step 1: what did you really say? (the AI does not see the target here)
      const heard = await ai.run((apiKey, model) => transcribeSpeech(apiKey, model, audio), onStatus);
      if (heard.noSpeech || !heard.heardPt) {
        setStatus(t('practice.noSpeech'), 'error');
        return;
      }
      // Step 2: compare with the target and explain.
      const feedback = await ai.run((apiKey, model) => pronunciationFeedback(apiKey, model, target, heard.heardPt, audio), onStatus);
      showFeedback({ ...feedback, heardPt: heard.heardPt }, target);
    } catch (error) {
      setStatus(t(errorMessageKey(error), { detail: error?.message || '' }), 'error');
    } finally {
      checking = false;
      $('#practice-record').disabled = false;
    }
  }

  async function toggleRecording() {
    if (checking) return;
    if (recording) return finishRecording();
    if (!isRecordingSupported()) return setStatus(t('practice.unsupported'), 'error');

    if (starting) return;
    stopSpeaking(); // the phone must not record its own voice
    clearResult();
    starting = true;
    const mySession = session;
    let started;
    try {
      started = await startRecording({ onAutoStop: () => finishRecording() });
    } catch (error) {
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      return setStatus(t(denied ? 'practice.micDenied' : 'practice.unsupported'), 'error');
    } finally {
      starting = false;
    }
    // Privacy: if the user left (new photo, other screen) while the mic was
    // starting, turn it off immediately instead of recording in the background.
    if (mySession !== session) {
      started.cancel();
      return;
    }
    recording = started;
    const startedAt = Date.now();
    setRecordButton(true, 0);
    setStatus(t('practice.recording'));
    tickTimer = setInterval(() => setRecordButton(true, Math.floor((Date.now() - startedAt) / 1000)), 500);
  }

  $('#practice-prev').addEventListener('click', () => { if (!recording && index > 0) { index -= 1; showTarget(); } });
  $('#practice-next').addEventListener('click', () => { if (!recording && index < targets.length - 1) { index += 1; showTarget(); } });
  $('#practice-listen').addEventListener('click', (event) => speak(targets[index], { button: event.currentTarget }));
  $('#practice-slow').addEventListener('click', (event) => speak(targets[index], { slow: true, button: event.currentTarget }));
  $('#practice-record').addEventListener('click', toggleRecording);

  return {
    // Called with each new result: short words first (easier), then sentences.
    setTargets(result) {
      this.reset();
      const words = result.vocabulary.map((word) => word.pt);
      targets = [...new Set([...words, ...splitSentences(result.descriptionPt)])];
      index = 0;
      $('#practice').hidden = targets.length === 0;
      setRecordButton(false);
      showTarget();
    },
    // Stops everything (new photo, leaving the screen).
    reset() {
      session += 1;
      clearInterval(tickTimer);
      recording?.cancel();
      recording = null;
      setRecordButton(false);
      stopSpeaking();
      clearResult();
    },
  };
}
