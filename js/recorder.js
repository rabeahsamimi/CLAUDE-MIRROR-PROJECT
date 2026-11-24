// recorder.js — records the student's voice and prepares it for the AI.
//
// 1. MediaRecorder records from the microphone (iPhone saves it as AAC/MP4).
// 2. We decode that recording and turn it into WAV: 16 000 samples per second,
//    one channel. WAV is accepted by every Gemini model, and 16 kHz mono is
//    the standard quality for speech (a 10-second answer is about 320 KB).
// 3. We also measure how loud it was, to catch "nothing was said" for free,
//    before spending any quota.

export const MAX_SECONDS = 15;
const TARGET_RATE = 16000;

export function isRecordingSupported() {
  return Boolean(
    navigator.mediaDevices?.getUserMedia
    && window.MediaRecorder
    && (window.AudioContext || window.webkitAudioContext)
    && (window.OfflineAudioContext || window.webkitOfflineAudioContext),
  );
}

// Starts recording. Returns { stop(), cancel() }.
// stop() resolves to { blob, seconds } (the original recording).
// onAutoStop is called if the recording reaches MAX_SECONDS by itself.
export async function startRecording({ onAutoStop } = {}) {
  // Asking for the microphone shows the iPhone permission popup (first time only).
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
  });
  const preferred = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'];
  const mimeType = preferred.find((type) => window.MediaRecorder.isTypeSupported?.(type)) || '';
  const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  const chunks = [];
  const startedAt = performance.now();

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  const finished = new Promise((resolve) => {
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop()); // turns the mic off (orange dot disappears)
      resolve({
        blob: new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/mp4' }),
        seconds: (performance.now() - startedAt) / 1000,
      });
    };
  });

  recorder.start();
  const timer = setTimeout(() => {
    if (recorder.state === 'recording') {
      recorder.stop();
      onAutoStop?.();
    }
  }, MAX_SECONDS * 1000);

  return {
    stop() {
      clearTimeout(timer);
      if (recorder.state === 'recording') recorder.stop();
      return finished;
    },
    cancel() {
      clearTimeout(timer);
      if (recorder.state === 'recording') recorder.stop();
      stream.getTracks().forEach((track) => track.stop());
    },
  };
}

// Turns raw audio samples into a WAV file (a simple, well-known audio format).
function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset, text) => { for (let i = 0; i < text.length; i += 1) view.setUint8(offset + i, text.charCodeAt(i)); };
  writeText(0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, 'WAVE');
  writeText(12, 'fmt ');
  view.setUint32(16, 16, true);          // size of the format block
  view.setUint16(20, 1, true);           // 1 = PCM (uncompressed)
  view.setUint16(22, 1, true);           // 1 channel (mono)
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);          // 16 bits per sample
  writeText(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000; // convert in pieces so long recordings do not crash
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

// Recording (any format the browser made) -> { base64, mimeType: 'audio/wav', seconds, peak }
// peak = loudest moment, from 0 (silence) to 1 (maximum).
export async function toWav(blob) {
  const Context = window.AudioContext || window.webkitAudioContext;
  const context = new Context();
  let decoded;
  try {
    decoded = await context.decodeAudioData(await blob.arrayBuffer());
  } finally {
    context.close?.();
  }
  const Offline = window.OfflineAudioContext || window.webkitOfflineAudioContext;
  const length = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
  const offline = new Offline(1, length, TARGET_RATE); // mixes to mono and resamples to 16 kHz
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();
  const samples = rendered.getChannelData(0);

  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) peak = Math.max(peak, Math.abs(samples[i]));

  return { base64: bytesToBase64(encodeWav(samples, TARGET_RATE)), mimeType: 'audio/wav', seconds: decoded.duration, peak };
}
