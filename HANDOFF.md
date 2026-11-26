# Handoff: Espelho IA

Written 2026-11-26 at the end of the first build session. Read this first, then `PLAN.md` (status and decisions, in Persian) and `LEARNING.md` (concepts taught so far).

## 1. What this is
A Portuguese-learning PWA for one user, Rabeah (Porto Alegre, Brazil). He photographs an object with his iPhone. The app then:
- describes the object in Brazilian Portuguese at his level (A1/A2/B1),
- reads it aloud,
- checks his pronunciation,
- holds a 5-question conversation with corrections.

Later stages will add memory of weak points, a review screen and offline support.

- **Live site:** https://rabeahsamimi.github.io/CLAUDE-MIRROR-PROJECT/ (GitHub Pages, deployed from branch `claude/artifact-code-session-e2mgrb`, root folder)
- **Repo:** `rabeahsamimi/CLAUDE-MIRROR-PROJECT` (public). Develop and push on `claude/artifact-code-session-e2mgrb`. Pushing there redeploys the site in about 1–2 minutes.
- **Original brief:** a Claude Docs doc, "Prompt for Claude Code - AI Mirror" (https://claude.ai/code/artifact/8319b9e2-f7b7-46d0-8769-6b561ff0154f). It defines 8 stages and the working rules summarized below.

## 2. How to work with Rabeah (from his brief and profile)
- **Language:** reply in **Persian (Persian script)**. Keep code, technical terms, file names and Portuguese in their original language.
- **Level and context:** he is a beginner, uses an **iPhone only** (no computer), and accepts **free/open tools only**.
- **Autonomy:** do everything yourself (code, tests, git, deploy). Ask only when truly blocked, or before irreversible or public actions.
- **When he must act:**
  - give one sentence on why,
  - give numbered iPhone-only steps,
  - say what he should see after each step and what to do if he sees something different,
  - give exact text to copy,
  - wait for "done".
- **After each stage**, send a short Persian summary: what was built, the main files, and **one new concept**. Then append that concept to `LEARNING.md`, with review questions; the answers go at the end of the file.
- **Pushback:** push back with evidence when a better approach exists. He values this, and it has already improved the app (no proxy; B1 reading vs simpler speaking).
- **Honesty:** be honest about limits, e.g. pronunciation feedback is approximate.

## 3. Status

| Stage | Topic | Status |
|---|---|---|
| 1 | Research and tool choice | ✅ |
| 2 | Setup and hosting | ✅ (repo made public, Pages on, key works) |
| 3 | Camera and AI description | ✅ tested on iPhone: correct, about 10 s, natural Persian. He uses **B1** |
| 4 | Listen (TTS) and pronunciation | ✅ tested on iPhone after the two-step fix |
| 5 | Conversation and corrections | 🟡 **v0.5.0 pushed, not yet tested by Rabeah.** His last message only said "Hand off" |
| 6 | Memory and progress | ⏳ next |
| 7 | Review screen, polish, PWA install, offline | ⏳ |
| 8 | Final iPhone test, README, "keep improving" guide | ⏳ |

**First thing next session:** ask Rabeah for his stage 5 test results. Questions still open:
- Are the questions too hard, too easy, or right?
- Are the corrections correct and clear? (Ask him to copy any wrong ones.)
- Roughly how many seconds does each turn take?
- What is his iPhone's pt-BR voice name? He was asked twice and never answered; low priority.

## 4. Architecture (plain HTML/CSS/JS, no build, ES modules)
```
index.html            all screens; text comes from i18n.js (data-i18n attributes)
css/styles.css        tokens, light/dark (auto + forced), RTL-aware (logical properties)
js/app.js             entry: navigation, Settings, voice card, APP_VERSION
js/i18n.js            every UI string in fa and pt; t(key, vars); applyLanguage()
js/settings.js        localStorage settings: apiKey, model, level, uiLang, theme, onboarded
js/gemini.js          Gemini REST client: request(), errorFromResponse(), listModels(), pickModel(),
                      fallbackModels(), withRetry(), runWithFallback(), generateJson(), describeImage(),
                      transcribeSpeech(), pronunciationFeedback(), conversationTurn(), MISTAKE_CATEGORIES
js/ai.js              createAi({getSettings, save}).run(task, onStatus) + errorMessageKey(); use this from screens
js/image.js           photo -> 1024px JPEG base64 (canvas)
js/speech.js          speechSynthesis; pickVoice() prefers pt-BR Enhanced, never pt-PT
js/recorder.js        MediaRecorder -> WAV 16 kHz mono base64 + peak (silence check)
js/mirror.js          Mirror screen states: start | loading | error | result | chat
js/practice.js        pronunciation practice; compareWords(), combineVerdict(), splitSentences()
js/conversation.js    5-question chat; onFinished(summary) callback (summary.mistakes has categories)
tests/run-tests.cjs   60 Playwright end-to-end tests (iPhone 13 viewport, mocked Gemini, fake mic/speech)
tools/make-icons.cjs  PNG icons from icons/icon.svg
```

## 5. Key decisions (details and sources in PLAN.md)
- **AI:** Google Gemini API, free tier, key from AI Studio.
  - Default model: `gemini-3.5-flash-lite`. It has the largest free daily quota (about 500 RPD reported) and accepts image and audio.
  - The model is picked automatically from `models.list` and saved.
  - Errors handled:
    - 5xx / "high demand": retry twice (1.5 s, 4 s).
    - Still busy, or 429: try up to 2 other models.
    - 404: re-pick the model.
- **Key storage:** the API key lives **only in the phone's localStorage** (BYOK). Rabeah agreed to **no proxy**.
  - Strict CSP: only `self` and `generativelanguage.googleapis.com`.
  - Render AI text with `textContent`, **never `innerHTML`**.
  - A test greps the code for keys.
  - Newer Google keys **don't start with `AIza`**: never validate the key prefix.
- **Structured output everywhere:** use `responseSchema` with JSON responses, and clean every field (`clean*` functions).
  - For the conversation, the input is also sent as JSON, so the student's answer is treated as data and not as instructions (prompt-injection defense).
- **Pronunciation runs in two steps** to avoid bias:
  - (1) transcribe **without** the target;
  - (2) compare and give feedback, with generic tips forbidden.
  - An on-device `combineVerdict` means missed words can never be rated "good". Rabeah confirmed this works.
- **Camera:** `<input type=file accept=image/* capture=environment>`, plus a gallery input. No `getUserMedia` video.
- **Persian tone:** always informal «تو», never «شما». This is in every system instruction.
- **Conversation difficulty:** questions are slightly easier than the reading level (he reads B1 but is a speaking beginner).
- **Privacy:** the mic is turned off on reset/pause/leave, including the race where the mic is still starting (session counters). There are tests for this.

## 6. Conventions and gotchas
- **On every user-visible release:**
  - bump `APP_VERSION` in `js/app.js` (shown in Settings; Rabeah uses it to confirm updates) and `version` in `package.json`;
  - update the PLAN.md status table, checklist, and next-stage section;
  - update LEARNING.md;
  - update the README status line.
- **Strings:** every new UI string goes in **both** `fa` and `pt` in `js/i18n.js`.
- **Tests:** run them with `npm test` (needs the pre-installed Playwright/Chromium). All must pass before pushing. Add tests for each feature and a regression test for each bug.
- **Screenshots:** `SCREENSHOT_DIR=<dir> npm test` saves screenshots; look at them for layout bugs.
- **Network:** the container's network **blocks** `generativelanguage.googleapis.com`, `ai.google.dev` and `console.groq.com` (WebSearch works). Real AI quality can only be checked by Rabeah on his iPhone, so describe what he should see.
- **Commits:** detailed English messages ending with the Co-Authored-By / Claude-Session trailer lines from the system reminder. No model names in commits.
- **No service worker yet:** this is deliberate, to avoid stale caches during development. Add one in stage 7 with a network-first strategy for the app shell, and bump a cache version on each release.

## 7. Next: Stage 6 (memory and progress)
1. `js/storage.js`: an IndexedDB wrapper.
   - Stores: `words` (pt, fa, firstSeen, timesSeen, lastSeen), `mistakes` (wrong, right, category, explanationFa, object, date), `sessions` (date, object, level, correct, total).
   - Use try/catch everywhere; the app must still work if IndexedDB is blocked.
2. Save data from:
   - `mirror.js` `showResult`: vocabulary;
   - `initMirror({ onConversationFinished })`: the parameter already exists in `mirror.js`, but `app.js` does not pass it yet. Add a handler in `app.js`;
   - pronunciation results (optional).
3. **Streak:** count consecutive days with at least one session (local dates, America/Sao_Paulo).
4. **Progress screen** (replace the empty state):
   - totals,
   - streak,
   - top weak categories with Persian names (map `MISTAKE_CATEGORIES` to fa/pt labels),
   - recent mistakes,
   - learned words.
5. **Feed weak points into the AI:** pass the top 2–3 categories into `conversationTurn` and the description prompt, so questions target them.
6. **Durability:**
   - call `navigator.storage.persist()` at start;
   - add **Export/Import JSON backup** in Settings (Safari can evict data; Home Screen apps are mostly exempt).
7. Write tests for all of the above, using fake IndexedDB data via `addInitScript` where needed.

**Stage 7:**
- Review screen: spaced repetition (a simple Leitner system) over saved words and mistakes, plus pronunciation drills. It works offline except the AI parts.
- Service worker and offline support.
- An "Add to Home Screen" guide.
- Try to cut the ~10 s latency: a smaller image (768px?), a lower `maxOutputTokens`, and check whether the model's "thinking" can be disabled.

**Stage 8:**
- a final iPhone checklist with Rabeah,
- a polished English README (portfolio),
- a Persian "how to keep improving this app" guide,
- ask him about a LICENSE (MIT suggested),
- maybe merge to `main` (needs his OK and a Pages source change).

## 8. Prompt to start the next session
> Read HANDOFF.md, PLAN.md and LEARNING.md in this repo. Continue Espelho IA from where it stopped: first ask me (in Persian) for my test results of stage 5 (v0.5.0), fix anything I report, then build stage 6 following HANDOFF.md section 7 and the working rules in section 2.
