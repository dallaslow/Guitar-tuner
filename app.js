// Minimal no-build React-free implementation using Web Audio + autocorrelation
// Works offline as a PWA after the first load (HTTPS required)

const noteEl = document.getElementById('note');
const freqEl = document.getElementById('freq');
const needleEl = document.getElementById('needle');
const a4El = document.getElementById('a4');
const a4ValEl = document.getElementById('a4val');
const errEl = document.getElementById('err');
const ticksEl = document.getElementById('ticks');

// draw ticks
for (let i = 0; i <= 10; i++) {
  const d = document.createElement('div');
  d.className = 'tick';
  d.style.left = (i * 10) + '%';
  ticksEl.appendChild(d);
}

let A4 = 440;
a4El.addEventListener('input', () => {
  A4 = parseInt(a4El.value, 10);
  a4ValEl.textContent = String(A4);
});

let audioCtx = null;
let analyser = null;
let source = null;
let raf = null;
let buffer = null;
let currentFreq = null;

function freqToNote(frequency, A4 = 440) {
  const note = 69 + 12 * Math.log2(frequency / A4);
  const rounded = Math.round(note);
  const cents = Math.floor((note - rounded) * 100);
  const names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
  const name = names[(rounded % 12 + 12) % 12];
  const octave = Math.floor(rounded / 12) - 1;
  return { name, octave, cents, midi: rounded };
}

function autoCorrelateTimeDomain(buf, sampleRate) {
  const SIZE = buf.length;
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.008) return null;

  let last = 0;
  for (let i = 0; i < SIZE; i++) {
    const val = buf[i] - last * 0.97;
    last = buf[i];
    buf[i] = val;
  }

  const MAX_SAMPLES = Math.floor(SIZE / 2);
  const correlations = new Float32Array(MAX_SAMPLES);
  let bestOffset = -1;
  let bestCorr = 0;

  for (let offset = 0; offset < MAX_SAMPLES; offset++) {
    let corr = 0;
    for (let i = 0; i < MAX_SAMPLES; i++) {
      corr += buf[i] * buf[i + offset];
    }
    correlations[offset] = corr;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestOffset = offset;
    }
  }

  if (bestOffset <= 0) return null;

  const y0 = correlations[bestOffset - 1] || 0;
  const y1 = correlations[bestOffset];
  const y2 = correlations[bestOffset + 1] || 0;
  const shift = (y2 - y0) / (2 * (2 * y1 - y0 - y2));
  const period = bestOffset + shift;
  const frequency = sampleRate / period;

  if (frequency < 40 || frequency > 1400) return null;
  return frequency;
}

async function start() {
  try {
    errEl.style.display = 'none';
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;
    buffer = new Float32Array(analyser.fftSize);
    source.connect(analyser);
    tick();
  } catch (e) {
    errEl.textContent = (e && e.message) ? e.message : 'Microphone permission denied or unavailable.';
    errEl.style.display = 'block';
    stop();
  }
}

function stop() {
  if (raf) cancelAnimationFrame(raf);
  raf = null;
  if (audioCtx) {
    try { audioCtx.close(); } catch {}
  }
  audioCtx = null;
  analyser = null;
  source = null;
  buffer = null;
  noteEl.textContent = '—';
  freqEl.textContent = 'Play a note to tune';
  setNeedle(null);
}

function setNeedle(cents) {
  let deg = 0;
  if (typeof cents === 'number') {
    const clamped = Math.max(-50, Math.min(50, cents));
    deg = (clamped / 50) * 40;
  }
  needleEl.style.transform = `translateX(-50%) rotate(${deg}deg)`;
}

function tick() {
  if (!analyser || !buffer || !audioCtx) return;
  analyser.getFloatTimeDomainData(buffer);
  const f = autoCorrelateTimeDomain(buffer, audioCtx.sampleRate);
  if (f) {
    currentFreq = f;
    const { name, octave, cents } = freqToNote(f, A4);
    noteEl.textContent = `${name}${octave}`;
    freqEl.textContent = `${f.toFixed(2)} Hz`;
    setNeedle(cents);
  } else {
    setNeedle(null);
  }
  raf = requestAnimationFrame(tick);
}

document.getElementById('start').addEventListener('click', start);
document.getElementById('stop').addEventListener('click', stop);
document.getElementById('cal').addEventListener('click', () => {
  if (!currentFreq) return;
  // Calibrate A4 using current frequency as E2 reference (MIDI 40 -> actually E2 is 40? No, E2 MIDI is 40; A4 is 69; derive A4)
  // A4 = f * 2^((69 - midi)/12). If we assume currentFreq is E2 (midi 40), then:
  const assumedMidi = 40; // E2
  const newA4 = currentFreq * Math.pow(2, (69 - assumedMidi) / 12);
  A4 = Math.max(430, Math.min(450, Math.round(newA4)));
  a4El.value = String(A4);
  a4ValEl.textContent = String(A4);
});
