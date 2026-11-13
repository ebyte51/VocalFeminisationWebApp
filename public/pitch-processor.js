/**
 * AudioWorkletProcessor for pitch detection.
 * McLeod Pitch Method (MPM) — tuned for speech, not singing.
 *
 * Key design choices:
 *  - CLARITY_THRESHOLD 0.65  — speech rarely exceeds 0.75; sustained vowels hit 0.85+
 *  - No octave-doubling "correction" — that logic reliably maps F3 → C4 for speech
 *  - Median filter over 3 frames (not 5) — less latency, still smooths glitches
 *  - _lastHz reset to 0 on silence so stale state never contaminates next phrase
 */

const SAMPLE_RATE = 48000;
const WINDOW_SIZE = 2048;
const HOP_SIZE = 512;
const CLARITY_THRESHOLD = 0.65;
const MIN_HZ = 70;
const MAX_HZ = 700;

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer  = new Float32Array(WINDOW_SIZE);
    this._bufIdx  = 0;
    this._hopCtr  = 0;
    this._lastHz  = 0;
    // Median filter — 3 slots, initialised to -1 (empty sentinel)
    this._mBuf    = [-1, -1, -1];
    this._mIdx    = 0;
    this._mCount  = 0;
    this._active  = true;

    this.port.onmessage = (e) => {
      if (e.data === "stop")  this._active = false;
      if (e.data === "start") this._active = true;
    };
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch || !this._active) return true;

    for (let i = 0; i < ch.length; i++) {
      this._buffer[this._bufIdx % WINDOW_SIZE] = ch[i];
      this._bufIdx++;
      this._hopCtr++;

      if (this._hopCtr >= HOP_SIZE) {
        this._hopCtr = 0;
        this.port.postMessage(this._detect());
      }
    }
    return true;
  }

  // ─── Core MPM ──────────────────────────────────────────────────────────────

  _detect() {
    // Copy ring buffer into a linear frame
    const frame = new Float32Array(WINDOW_SIZE);
    const start = this._bufIdx % WINDOW_SIZE;
    for (let i = 0; i < WINDOW_SIZE; i++) {
      frame[i] = this._buffer[(start + i) % WINDOW_SIZE];
    }

    // Energy gate — skip silent frames cheaply
    let energy = 0;
    for (let i = 0; i < WINDOW_SIZE; i++) energy += frame[i] * frame[i];
    if (energy / WINDOW_SIZE < 1e-7) {
      this._lastHz = 0;
      this._mBuf = [-1, -1, -1]; this._mIdx = 0; this._mCount = 0;
      return { hz: 0, clarity: 0 };
    }

    // Normalised Square Difference Function (NSDF)
    const nsdf = new Float32Array(WINDOW_SIZE);
    for (let tau = 0; tau < WINDOW_SIZE; tau++) {
      let acf = 0, m = 0;
      const len = WINDOW_SIZE - tau;
      for (let i = 0; i < len; i++) {
        acf += frame[i] * frame[i + tau];
        m   += frame[i] * frame[i] + frame[i + tau] * frame[i + tau];
      }
      nsdf[tau] = m < 1e-10 ? 0 : (2 * acf) / m;
    }

    // Find the BEST peak above threshold in the valid lag range
    // "Best" = highest NSDF value, not first — more robust for speech
    const minPeriod = Math.floor(SAMPLE_RATE / MAX_HZ); // ~69 samples for 700 Hz
    const maxPeriod = Math.floor(SAMPLE_RATE / MIN_HZ); // ~686 samples for 70 Hz

    let bestVal    = -Infinity;
    let bestPeriod = -1;
    let inPositive = false;

    for (let tau = minPeriod; tau < maxPeriod && tau < WINDOW_SIZE; tau++) {
      if (!inPositive && nsdf[tau] > 0) inPositive = true;

      if (inPositive) {
        if (nsdf[tau] > bestVal) {
          bestVal    = nsdf[tau];
          bestPeriod = tau;
        }
        // Once we fall back below zero after finding a candidate, stop.
        // This keeps us in the first positive lobe (= fundamental), not harmonics.
        if (nsdf[tau] < 0 && bestPeriod >= 0) break;
      }
    }

    if (bestPeriod < 0 || bestVal < CLARITY_THRESHOLD) {
      this._lastHz = 0;
      this._mBuf = [-1, -1, -1]; this._mIdx = 0; this._mCount = 0;
      return { hz: 0, clarity: bestVal > 0 ? bestVal : 0 };
    }

    // Parabolic interpolation for sub-sample accuracy
    const y0 = nsdf[Math.max(0, bestPeriod - 1)];
    const y1 = nsdf[bestPeriod];
    const y2 = nsdf[Math.min(WINDOW_SIZE - 1, bestPeriod + 1)];
    const denom = 2 * (2 * y1 - y0 - y2);
    const offset = denom !== 0 ? (y0 - y2) / denom : 0;
    const hz = SAMPLE_RATE / (bestPeriod + offset);

    // Sanity-check range (parabolic offset can occasionally go wild)
    if (hz < MIN_HZ || hz > MAX_HZ) {
      this._lastHz = 0;
      return { hz: 0, clarity: bestVal };
    }

    // 3-frame median filter — smooths single-frame glitches without adding latency
    this._mBuf[this._mIdx % 3] = hz;
    this._mIdx++;
    this._mCount = Math.min(this._mCount + 1, 3);
    const filled = this._mBuf.filter((v) => v >= 0).sort((a, b) => a - b);
    const median = filled[Math.floor(filled.length / 2)];

    this._lastHz = median;
    return { hz: median, clarity: bestVal };
  }
}

registerProcessor("pitch-processor", PitchProcessor);
