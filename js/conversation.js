// conversation.js — "Talk about this object": 5 short questions, gentle corrections.
//
// Each turn:   you answer (typing or voice)  ->  AI corrects it  ->  AI asks the next question.
// "I don't know" shows an example answer, and you can try again.
// At the end, a summary shows how many answers were correct and every mistake.

import { t } from './i18n.js';
import { speak, stopSpeaking } from './speech.js';
import { isRecordingSupported, startRecording, toWav, MAX_SECONDS } from './recorder.js';
import { conversationTurn, transcribeSpeech } from './gemini.js';
import { errorMessageKey } from './ai.js';

export const TOTAL_QUESTIONS = 5;
const $ = (selector) => document.querySelector(selector);

// Small helper to build an element with a class, text and language.
function el(tag, { className = '', text = '', lang = '', dir = '' } = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  if (lang) node.lang = lang;
  if (dir) node.dir = dir;
  return node;
}

function speakerButton(text) {
  const button = el('button', { className: 'icon-button icon-button--small' });
  button.type = 'button';
  button.setAttribute('aria-label', t('speak.listen'));
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

// onFinished(summary) is called at the end (stage 6 will save the mistakes).
export function initConversation({ ai, getSettings, onBack, onFinished }) {
  let topic = null;          // { objectPt, descriptionPt, level }
  let history = [];          // [{ question, answer, corrected }]
  let question = null;       // { pt, fa }
  let questionNumber = 0;
  let correctCount = 0;
  let mistakes = [];
  let waiting = false;       // true while waiting for the AI
  let session = 0;           // changes on reset; late answers from an old session are ignored
  let recording = null;
  let recordStarting = false;
  let micSession = 0;        // changes on reset AND pause: a mic that starts late is turned off
  let tickTimer = null;

  const messages = () => $('#chat-messages');

  function setStatus(text, kind = 'info') {
    const status = $('#chat-status');
    status.textContent = text;
    status.dataset.kind = kind;
  }

  function setWaiting(isWaiting) {
    waiting = isWaiting;
    for (const id of ['#chat-send', '#chat-help', '#chat-mic']) $(id).disabled = isWaiting;
    $('#chat-form').setAttribute('aria-busy', String(isWaiting));
  }

  function updateProgress() {
    $('#chat-progress').textContent = t('chat.progress', { n: Math.min(questionNumber, TOTAL_QUESTIONS), total: TOTAL_QUESTIONS });
  }

  function scrollToEnd() {
    const last = messages().lastElementChild;
    // 'auto' (instant) is more reliable than 'smooth' when several messages arrive at once.
    last?.scrollIntoView({ block: 'nearest', behavior: 'auto' });
  }

  // ---------- messages ----------
  function addQuestion(pt, fa) {
    const item = el('li', { className: 'msg msg--ai' });
    const row = el('div', { className: 'msg__row' });
    row.append(el('p', { className: 'msg__pt', text: pt, lang: 'pt-BR', dir: 'ltr' }), speakerButton(pt));
    item.append(row);
    if (fa) {
      const details = el('details', { className: 'msg__translation' });
      details.append(el('summary', { text: t('mirror.translation') }), el('p', { text: fa, lang: 'fa', dir: 'rtl' }));
      item.append(details);
    }
    messages().append(item);
    scrollToEnd();
  }

  function addAnswer(text) {
    messages().append(el('li', { className: 'msg msg--me', text, lang: 'pt-BR', dir: 'ltr' }));
    scrollToEnd();
  }

  function addCorrection(turn) {
    const item = el('li', { className: `msg msg--feedback ${turn.isCorrect ? 'msg--ok' : 'msg--fix'}` });
    item.append(el('p', { className: 'msg__verdict', text: t(turn.isCorrect ? 'chat.correct' : 'chat.almost') }));
    if (turn.correctedPt) {
      const row = el('div', { className: 'msg__row' });
      row.append(el('p', { className: 'msg__pt msg__corrected', text: turn.correctedPt, lang: 'pt-BR', dir: 'ltr' }), speakerButton(turn.correctedPt));
      item.append(row);
    }
    if (turn.mistakes.length) {
      const list = el('ul', { className: 'mistakes' });
      for (const mistake of turn.mistakes) {
        const li = el('li');
        const change = el('p', { className: 'mistakes__change', dir: 'ltr', lang: 'pt-BR' });
        if (mistake.wrong) change.append(el('s', { text: mistake.wrong }), ' → ');
        change.append(el('strong', { text: mistake.right }));
        li.append(change);
        if (mistake.explanationFa) li.append(el('p', { className: 'mistakes__why', text: mistake.explanationFa, lang: 'fa', dir: 'rtl' }));
        list.append(li);
      }
      item.append(list);
    }
    if (turn.commentFa) item.append(el('p', { className: 'msg__comment', text: turn.commentFa, lang: 'fa', dir: 'rtl' }));
    messages().append(item);
    scrollToEnd();
  }

  function addHelp(turn) {
    const item = el('li', { className: 'msg msg--help' });
    item.append(el('p', { className: 'msg__verdict', text: t('chat.example') }));
    if (turn.modelAnswerPt) {
      const row = el('div', { className: 'msg__row' });
      row.append(el('p', { className: 'msg__pt', text: turn.modelAnswerPt, lang: 'pt-BR', dir: 'ltr' }), speakerButton(turn.modelAnswerPt));
      item.append(row);
    }
    if (turn.commentFa) item.append(el('p', { className: 'msg__comment', text: turn.commentFa, lang: 'fa', dir: 'rtl' }));
    item.append(el('p', { className: 'hint hint--small', text: t('chat.tryNow') }));
    messages().append(item);
    scrollToEnd();
  }

  // ---------- talking to the AI ----------
  function context(mode, answer = '') {
    return {
      mode,
      object: topic.objectPt,
      description: topic.descriptionPt,
      level: topic.level,
      questionNumber,
      totalQuestions: TOTAL_QUESTIONS,
      history,
      currentQuestion: question?.pt || '',
      answer,
    };
  }

  async function ask(mode, answer = '') {
    const mySession = session;
    setWaiting(true);
    setStatus(t('chat.thinking'));
    try {
      const turn = await ai.run(
        (apiKey, model) => conversationTurn(apiKey, model, context(mode, answer)),
        (status) => setStatus(t(status === 'busy' ? 'mirror.busyRetrying' : 'mirror.tryingOtherModel')),
      );
      if (mySession !== session) return null; // the user left meanwhile
      setStatus('');
      return turn;
    } catch (error) {
      if (mySession === session) setStatus(t(errorMessageKey(error), { detail: error?.message || '' }), 'error');
      return null;
    } finally {
      if (mySession === session) setWaiting(false);
    }
  }

  function setQuestion(pt, fa) {
    question = { pt, fa };
    questionNumber += 1;
    updateProgress();
    addQuestion(pt, fa);
  }

  async function begin() {
    const turn = await ask('start');
    if (!turn) {
      $('#chat-retry-start').hidden = false;
      return;
    }
    if (!turn.nextQuestionPt) {
      setStatus(t('mirror.errorBadResponse'), 'error');
      $('#chat-retry-start').hidden = false;
      return;
    }
    setQuestion(turn.nextQuestionPt, turn.nextQuestionFa);
    $('#chat-input').focus({ preventScroll: true });
  }

  async function sendAnswer(event) {
    event?.preventDefault();
    if (waiting || !question) return;
    const input = $('#chat-input');
    const answer = input.value.trim();
    if (!answer) {
      setStatus(t('chat.empty'), 'error');
      return;
    }
    stopRecording(true);
    const turn = await ask('answer', answer);
    if (!turn) return; // error shown; the answer stays in the box so nothing is lost
    input.value = '';
    addAnswer(answer);
    addCorrection(turn);
    if (turn.isCorrect) correctCount += 1;
    mistakes.push(...turn.mistakes.map((m) => ({ ...m, question: question.pt, answer })));
    history.push({ question: question.pt, answer, corrected: turn.correctedPt });

    if (questionNumber >= TOTAL_QUESTIONS || !turn.nextQuestionPt) finish();
    else setQuestion(turn.nextQuestionPt, turn.nextQuestionFa);
  }

  async function askHelp() {
    if (waiting || !question) return;
    const turn = await ask('help');
    if (turn) addHelp(turn);
  }

  function finish() {
    question = null;
    $('#chat-form').hidden = true;
    const answered = history.length;
    $('#chat-score').textContent = t('chat.score', { correct: correctCount, total: answered });
    const list = $('#chat-summary-mistakes');
    list.replaceChildren();
    for (const mistake of mistakes) {
      const li = el('li', { dir: 'ltr', lang: 'pt-BR' });
      if (mistake.wrong) li.append(el('s', { text: mistake.wrong }), ' → ');
      li.append(el('strong', { text: mistake.right }));
      list.append(li);
    }
    $('#chat-summary-none').hidden = mistakes.length > 0;
    $('#chat-summary-list-title').hidden = mistakes.length === 0;
    $('#chat-summary').hidden = false;
    $('#chat-summary').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    onFinished?.({ object: topic.objectPt, level: topic.level, correct: correctCount, total: answered, mistakes: [...mistakes] });
  }

  // ---------- voice answer ----------
  function setMicButton(isRecording, seconds = 0) {
    const button = $('#chat-mic');
    button.classList.toggle('is-recording', isRecording);
    button.setAttribute('aria-pressed', String(isRecording));
    button.setAttribute('aria-label', isRecording ? t('chat.micStop', { seconds: Math.max(0, MAX_SECONDS - seconds) }) : t('chat.mic'));
  }

  function stopRecording(discard) {
    clearInterval(tickTimer);
    if (!recording) return null;
    const current = recording;
    recording = null;
    setMicButton(false);
    if (discard) {
      current.cancel();
      return null;
    }
    return current.stop();
  }

  async function transcribeRecording() {
    const stopped = stopRecording(false);
    if (!stopped) return;
    const mySession = session;
    const { blob, seconds } = await stopped;
    setWaiting(true);
    setStatus(t('practice.checking'));
    try {
      if (seconds < 0.5 || blob.size === 0) return setStatus(t('practice.noSpeech'), 'error');
      const audio = await toWav(blob);
      if (audio.peak < 0.02) return setStatus(t('practice.noSpeech'), 'error');
      const heard = await ai.run((apiKey, model) => transcribeSpeech(apiKey, model, audio));
      if (mySession !== session) return undefined;
      if (heard.noSpeech || !heard.heardPt) return setStatus(t('practice.noSpeech'), 'error');
      // The text goes into the box, not straight to the AI: check it, fix it, then send.
      const input = $('#chat-input');
      input.value = [input.value.trim(), heard.heardPt].filter(Boolean).join(' ');
      setStatus(t('chat.checkText'));
      return undefined;
    } catch (error) {
      if (mySession === session) setStatus(t(errorMessageKey(error), { detail: error?.message || '' }), 'error');
      return undefined;
    } finally {
      if (mySession === session) setWaiting(false);
    }
  }

  async function toggleMic() {
    if (waiting || recordStarting) return;
    if (recording) return transcribeRecording();
    if (!isRecordingSupported()) return setStatus(t('practice.unsupported'), 'error');
    stopSpeaking();
    recordStarting = true;
    const myMic = micSession;
    let started;
    try {
      started = await startRecording({ onAutoStop: () => transcribeRecording() });
    } catch (error) {
      const denied = error?.name === 'NotAllowedError' || error?.name === 'SecurityError';
      return setStatus(t(denied ? 'practice.micDenied' : 'practice.unsupported'), 'error');
    } finally {
      recordStarting = false;
    }
    if (myMic !== micSession) {
      started.cancel(); // privacy: the user left while the mic was starting
      return undefined;
    }
    recording = started;
    const startedAt = Date.now();
    setMicButton(true, 0);
    setStatus(t('chat.recording'));
    tickTimer = setInterval(() => setMicButton(true, Math.floor((Date.now() - startedAt) / 1000)), 500);
    return undefined;
  }

  // ---------- wiring ----------
  $('#chat-form').addEventListener('submit', sendAnswer);
  $('#chat-help').addEventListener('click', askHelp);
  $('#chat-mic').addEventListener('click', toggleMic);
  $('#chat-back').addEventListener('click', () => onBack?.());
  $('#chat-retry-start').addEventListener('click', () => { $('#chat-retry-start').hidden = true; begin(); });
  $('#chat-restart').addEventListener('click', () => api.start(topic, $('#chat-photo').getAttribute('src')));
  // On iPhone, the Return key adds a line; Send is the button. On a keyboard, Enter sends.
  $('#chat-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.isComposing && window.matchMedia('(hover: hover)').matches) sendAnswer(event);
  });

  const api = {
    // topic = { objectPt, descriptionPt, level }
    start(newTopic, photoUrl) {
      this.reset();
      topic = newTopic;
      if (photoUrl) $('#chat-photo').src = photoUrl;
      $('#chat-object').textContent = topic.objectPt;
      updateProgress();
      begin();
    },
    reset() {
      session += 1;
      micSession += 1;
      stopRecording(true);
      stopSpeaking();
      topic = null;
      history = [];
      question = null;
      questionNumber = 0;
      correctCount = 0;
      mistakes = [];
      messages().replaceChildren();
      $('#chat-input').value = '';
      $('#chat-form').hidden = false;
      $('#chat-summary').hidden = true;
      $('#chat-retry-start').hidden = true;
      setWaiting(false);
      setMicButton(false);
      setStatus('');
    },
    // Stop sound and microphone, but keep the conversation (e.g. switching tabs).
    pause() {
      micSession += 1;
      stopRecording(true);
      stopSpeaking();
    },
    // True if a conversation for the current photo exists (so "Talk" resumes it).
    isActive: () => Boolean(topic),
  };
  return api;
}
