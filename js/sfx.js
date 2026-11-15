// Cute sounds made in the browser. No audio files.
// Add a sound by writing a function that calls tone() or noise(),
// then add it to the sfx object at the bottom. Call it from js/app.js.

const SOUND_KEY = "squishymania.sound.v1";

let ctx = null;
let master = null;
let enabled = localStorage.getItem(SOUND_KEY) !== "off";

function reduced() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function scale() {
  return reduced() ? 0.45 : 1;
}

function context() {
  if (ctx) return ctx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx = new AudioCtx();
  master = ctx.createGain();
  master.gain.value = reduced() ? 0.14 : 0.28;
  master.connect(ctx.destination);
  return ctx;
}

function unlock() {
  const audio = context();
  if (!audio) return;
  if (audio.state === "suspended") audio.resume();
  const buffer = audio.createBuffer(1, 1, audio.sampleRate);
  const src = audio.createBufferSource();
  src.buffer = buffer;
  src.connect(master);
  src.start();
}

function play(build) {
  if (!enabled) return;
  const audio = context();
  if (!audio || !master) return;
  if (audio.state === "suspended") audio.resume();
  try {
    build(audio, audio.currentTime);
  } catch {
    // A missing or blocked audio device should never break the page.
  }
}

function tone(audio, when, { freq, dur, type = "sine", gain = 0.08, slide }) {
  const length = Math.max(0.04, dur * scale());
  const osc = audio.createOscillator();
  const amp = audio.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), when + length);
  const peak = gain * (reduced() ? 0.55 : 1);
  amp.gain.setValueAtTime(0.0001, when);
  amp.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), when + Math.min(0.03, length * 0.3));
  amp.gain.exponentialRampToValueAtTime(0.0001, when + length);
  osc.connect(amp);
  amp.connect(master);
  osc.start(when);
  osc.stop(when + length + 0.02);
}

function noise(audio, seconds) {
  const length = Math.max(1, Math.floor(audio.sampleRate * seconds));
  const buffer = audio.createBuffer(1, length, audio.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  const src = audio.createBufferSource();
  src.buffer = buffer;
  return src;
}

function squish() {
  play((audio, now) => {
    const dur = 0.18 * scale();
    tone(audio, now, { freq: 240, slide: 78, dur, type: "sine", gain: 0.1 });
    const src = noise(audio, dur);
    const filter = audio.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.exponentialRampToValueAtTime(140, now + dur);
    const amp = audio.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(reduced() ? 0.015 : 0.035, now + 0.02);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    src.start(now);
    src.stop(now + dur);
  });
}

function pop() {
  play((audio, now) => {
    tone(audio, now, { freq: 460, slide: 160, dur: 0.12, type: "sine", gain: 0.08 });
  });
}

function have() {
  play((audio, now) => {
    tone(audio, now, { freq: 210, slide: 90, dur: 0.16, type: "sine", gain: 0.09 });
    const notes = reduced() ? [784, 1175] : [784, 988, 1319, 1568];
    notes.forEach((freq, index) => {
      tone(audio, now + index * 0.07 * scale(), { freq, dur: 0.22, type: "triangle", gain: 0.05 });
    });
  });
}

function want() {
  play((audio, now) => {
    const notes = reduced() ? [880] : [988, 1319];
    notes.forEach((freq, index) => {
      tone(audio, now + index * 0.1 * scale(), { freq, dur: 0.2, type: "sine", gain: 0.04 });
    });
  });
}

function whoosh() {
  play((audio, now) => {
    const dur = 0.2 * scale();
    const src = noise(audio, dur);
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(280, now);
    filter.frequency.exponentialRampToValueAtTime(1400, now + dur);
    const amp = audio.createGain();
    amp.gain.setValueAtTime(0.0001, now);
    amp.gain.exponentialRampToValueAtTime(reduced() ? 0.02 : 0.04, now + 0.04);
    amp.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(master);
    src.start(now);
    src.stop(now + dur);
  });
}

function secret() {
  play((audio, now) => {
    const notes = reduced() ? [523, 784, 1046] : [523, 659, 784, 1046, 1319];
    notes.forEach((freq, index) => {
      const start = now + index * 0.11 * scale();
      tone(audio, start, { freq, dur: 0.28, type: "sine", gain: 0.055 });
      tone(audio, start, { freq: freq / 2, dur: 0.28, type: "triangle", gain: 0.02 });
    });
  });
}

function giggle() {
  play((audio, now) => {
    const notes = reduced() ? [520, 640] : [500, 680, 560, 760];
    notes.forEach((freq, index) => {
      tone(audio, now + index * 0.07 * scale(), { freq, dur: 0.08, type: "sine", gain: 0.045 });
    });
  });
}

["pointerdown", "touchstart", "keydown"].forEach((type) => {
  window.addEventListener(type, () => unlock(), { passive: true });
});

export const sfx = {
  squish,
  pop,
  have,
  want,
  whoosh,
  secret,
  giggle,
  unlock,
  isOn() {
    return enabled;
  },
  setOn(on) {
    enabled = Boolean(on);
    localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
    if (enabled) unlock();
  },
};
