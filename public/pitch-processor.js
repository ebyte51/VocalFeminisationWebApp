/**
 * AudioWorkletProcessor for pitch detection.
 * Uses the McLeod Pitch Method (MPM) — a simplified implementation.
 * Posts { hz, clarity } messages to the main thread.
 */

const SAMPLE_RATE = 48000;
const WINDOW_SIZE = 2048;
const HOP_SIZE = 512;
const CLARITY_THRESHOLD = 0.75;
const MIN_HZ = 70;
const MAX_HZ = 700;

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = new Float32Array(WINDOW_SIZE);
    this._bufferIdx = 0;
    this._hopCounter = 0;
    this._lastHz = 0;
    this._medianBuf = [-1, -1, -1, -1, -1];
    this._medianIdx = 0;
    this._medianCount = 0;
    this._active = true;

    this.port.onmessage = (e) => {
      if (e.data === "stop") this._active = false;
      if (e.data === "start") this._active = true;
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0]) return true;
    if (!this._active) return true;

    const samples = input[0];
    for (let i = 0; i < samples.length; i++) {
      this._buffer[this._bufferIdx % WINDOW_SIZE] = samples[i];
      this._bufferIdx++;
      this._hopCounter++;

      if (this._hopCounter >= HOP_SIZE) {
        this._hopCounter = 0;
        const result = this._detect();
        this.port.postMessage(result);
      }
    }
    return true;
  }

  _detect() {
    // Rearrange ring buffer into a linear frame
    const frame = new Float32Array(WINDOW_SIZE);
    const start = this._bufferIdx % WINDOW_SIZE;
    for (let i = 0; i < WINDOW_SIZE; i++) {
      frame[i] = this._buffer[(start + i) % WINDOW_SIZE];
    }

    // Normalised Square Difference Function (NSDF) — core of MPM
    const nsdf = new Float32Array(WINDOW_SIZE);
    const acf0 = this._acf(frame, 0);
    if (acf0 < 1e-6) return { hz: 0, clarity: 0 };

    for (let tau = 0; tau < WINDOW_SIZE; tau++) {
      const acfTau = this._acf(frame, tau);
      const m = this._m(frame, tau);
      nsdf[tau] = m < 1e-10 ? 0 : (2 * acfTau) / m;
    }

    // Find first peak above threshold
    const minPeriod = Math.floor(SAMPLE_RATE / MAX_HZ);
    const maxPeriod = Math.floor(SAMPLE_RATE / MIN_HZ);

    let maxVal = -Infinity;
    let period = -1;
    let inPeak = false;

    for (let tau = minPeriod; tau < maxPeriod; tau++) {
      if (!inPeak && nsdf[tau] > 0) inPeak = true;
      if (inPeak) {
        if (nsdf[tau] > maxVal) {
          maxVal = nsdf[tau];
          period = tau;
        }
        if (nsdf[tau] < 0) break;
      }
    }

    if (period < 0 || maxVal < CLARITY_THRESHOLD) {
      this._lastHz = 0; // reset continuity on silence
      return { hz: 0, clarity: maxVal > 0 ? maxVal : 0 };
    }

    // Parabolic interpolation for sub-sample accuracy
    const y0 = nsdf[Math.max(0, period - 1)];
    const y1 = nsdf[period];
    const y2 = nsdf[Math.min(WINDOW_SIZE - 1, period + 1)];
    const denom = 2 * (2 * y1 - y0 - y2);
    const offset = denom !== 0 ? (y0 - y2) / denom : 0;
    const refinedPeriod = period + offset;

    const hz = SAMPLE_RATE / refinedPeriod;

    // Octave continuity: prefer the value closest to last
    const octaveHz = hz * 2;
    let finalHz = hz;
    if (this._lastHz > 0) {
      const d1 = Math.abs(hz - this._lastHz);
      const d2 = Math.abs(octaveHz - this._lastHz);
      if (d2 < d1 && octaveHz < MAX_HZ) finalHz = octaveHz;
    }

    // Median filter over last 5 frames — only use populated slots
    this._medianBuf[this._medianIdx % 5] = finalHz;
    this._medianIdx++;
    this._medianCount = Math.min(this._medianCount + 1, 5);
    const filled = this._medianBuf.filter((v) => v >= 0);
    const sorted = [...filled].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    this._lastHz = median;
    return { hz: median, clarity: maxVal };
  }

  _acf(frame, tau) {
    let sum = 0;
    for (let i = 0; i < WINDOW_SIZE - tau; i++) {
      sum += frame[i] * frame[i + tau];
    }
    return sum;
  }

  _m(frame, tau) {
    let sum = 0;
    for (let i = 0; i < WINDOW_SIZE - tau; i++) {
      sum += frame[i] * frame[i] + frame[i + tau] * frame[i + tau];
    }
    return sum;
  }
}

registerProcessor("pitch-processor", PitchProcessor);
