// speech.js — reads Portuguese text aloud ("text-to-speech").
//
// It uses the speech engine built into the iPhone (speechSynthesis), which is
// free, works offline and sends nothing to the internet.
// iPhone has a basic Brazilian voice by default; a much more natural
// "Enhanced" voice can be downloaded in iPhone Settings (see the Settings screen).

const NORMAL_RATE = 0.95; // a little slower than normal speech
const SLOW_RATE = 0.7;    // for learning difficult words

export function isSpeechSupported() {
  return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
}

function allVoices() {
  try {
    return window.speechSynthesis.getVoices() || [];
  } catch {
    return [];
  }
}

// Chooses the best Brazilian Portuguese voice:
// Enhanced/Premium voices first, then the well-known iPhone voices.
// European Portuguese (pt-PT) is never chosen: it sounds very different.
export function pickVoice(voices) {
  const brazilian = voices.filter((voice) => /^pt[-_]BR$/i.test(voice.lang));
  const score = (voice) => (/(enhanced|premium|aprimorad|neural|natural)/i.test(voice.name) ? 2 : 0)
    + (/(luciana|felipe|fernanda)/i.test(voice.name) ? 1 : 0);
  return brazilian.sort((a, b) => score(b) - score(a))[0] || null;
}

// Voices can load a moment after the page opens; this waits for them (max ~1.5 s).
export function loadVoices() {
  return new Promise((resolve) => {
    if (!isSpeechSupported()) return resolve([]);
    const now = allVoices();
    if (now.length) return resolve(now);
    const finish = () => resolve(allVoices());
    window.speechSynthesis.addEventListener?.('voiceschanged', finish, { once: true });
    setTimeout(finish, 1500);
  });
}

export function portugueseVoiceName() {
  return pickVoice(allVoices())?.name || '';
}

let currentButton = null;

export function stopSpeaking() {
  if (!isSpeechSupported()) return;
  window.speechSynthesis.cancel();
  currentButton?.classList.remove('is-playing');
  currentButton = null;
}

// Speaks `text`. `button` (optional) shows a "playing" state while speaking.
// Tapping the same button again stops the speech.
export function speak(text, { slow = false, button = null } = {}) {
  if (!isSpeechSupported() || !text) return false;
  const sameButton = button && button === currentButton;
  stopSpeaking();
  if (sameButton) return true; // second tap = stop

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'pt-BR';
  const voice = pickVoice(allVoices());
  if (voice) utterance.voice = voice;
  utterance.rate = slow ? SLOW_RATE : NORMAL_RATE;

  if (button) {
    currentButton = button;
    button.classList.add('is-playing');
  }
  const done = () => {
    if (button && currentButton === button) {
      button.classList.remove('is-playing');
      currentButton = null;
    }
  };
  utterance.onend = done;
  utterance.onerror = done;
  window.speechSynthesis.speak(utterance);
  return true;
}
