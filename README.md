# Espelho IA (AI Mirror)

Learn Brazilian Portuguese with the real world as the classroom. Point your phone camera at an object; the app identifies it with AI, describes it in Portuguese at your level (A1–B1), asks you questions, corrects your answers gently (with explanations in Persian), and remembers your weak points for review.

**Status:** work in progress. Stage 2 of 8 is done (app shell, settings, PWA setup, automated tests). See [PLAN.md](PLAN.md).

## Design goals
- Runs in Safari on iPhone as an installable PWA: no App Store, no native build.
- 100% free: plain HTML/CSS/JavaScript, hosted on GitHub Pages, AI via the Google Gemini API free tier.
- Private by design: no backend. The user's API key and learning data stay on the device (`localStorage` / `IndexedDB`). A strict Content-Security-Policy allows only same-origin scripts and connections to the Gemini API.
- Bilingual interface: Persian (RTL) or Portuguese (LTR), light/dark themes, accessible markup.

## Project structure
```
index.html             single page with all screens
css/styles.css         design tokens, light/dark themes, RTL-aware layout
js/app.js              entry point: navigation, settings screen
js/i18n.js             UI strings (fa, pt) and language switching
js/settings.js         settings persisted in localStorage
js/gemini.js           Gemini API client (key check, automatic model selection)
manifest.webmanifest   PWA manifest
icons/                 app icons (icon.svg is the source)
tests/run-tests.cjs    end-to-end tests (Playwright, iPhone viewport, mocked API)
tools/make-icons.cjs   regenerates PNG icons from icons/icon.svg
```

## Run locally
Any static file server works, for example:
```
python3 -m http.server 8000
```
Then open http://localhost:8000.

## Tests
Requires Node.js and Playwright with Chromium.
```
npm test
```

## Learning notes
This project is also a learning journey; concepts are recorded (in Persian) in [LEARNING.md](LEARNING.md).
