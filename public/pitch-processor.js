/**
 * AudioWorkletProcessor — McLeod Pitch Method for speech.
 *
 * The correct MPM algorithm:
 *   1. Compute the NSDF (normalised square difference function).
 *   2. Find ALL local maxima above the threshold.
 *   3. Among those, pick the one at the LARGEST lag (= lowest frequency).
 *      This is the fundamental. Higher-frequency peaks are harmonics.
 *   4. Parabolic interpolation for sub-sample accuracy.
 *   5. Short median filter to remove single-frame glitches.
 *
 * Threshold 0.65 — appropriate for speech (not singing).
 * Range 70–400 Hz — covers C2 to G4, the full feminisation practice range.
 */

const SAMPLE_RATE     = 48000;
const WINDOW_SIZE     = 4096;   // larger window → better low-frequency resolution
const HOP_SIZE        = 512;
const CLARITY_THRESH  = 0.65;
const MIN_HZ          = 70;     // ~C2
const MAX_HZ          = 400;    // ~G4 — voices don't go above this in practice

class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf    = new Float32Array(WINDOW_SIZE);
    this._bufIdx = 0;
    this._hop    = 0;
    // 3-slot median filter
    this._med    = new Float32Array(3);
    this._mIdx   = 0;
    this._mFill  = 0;
    this._active = true;

    this.port.onmessage = (e) => {
      if (e.data === "stop")  this._active = false;
      if (e.data === "start") this._active = true;
    };
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch || !this._active) return true;

    for (let i = 0; i < ch.length; i++) {
      this._buf[this._bufIdx % WINDOW_SIZE] = ch[i];
      this._bufIdx++;
      if (++this._hop >= HOP_SIZE) {
        this._hop = 0;
        this.port.postMessage(this._detect());
      }
    }
    return true;
  }

  _detect() {
    // Linearise ring buffer
    const frame = new Float32Array(WINDOW_SIZE);
    const start = this._bufIdx % WINDOW_SIZE;
    for (let i = 0; i < WINDOW_SIZE; i++)
      frame[i] = this._buf[(start + i) % WINDOW_SIZE];

    // Energy gate
    let energy = 0;
    for (let i = 0; i < WINDOW_SIZE; i++) energy += frame[i] * frame[i];
    if (energy / WINDOW_SIZE < 1e-7) {
      this._resetMedian();
      return { hz: 0, clarity: 0 };
    }

    // NSDF — O(N²) but N=4096 runs fine in a worklet
    const minLag = Math.floor(SAMPLE_RATE / MAX_HZ); //  120 @ 48k, 400 Hz
    const maxLag = Math.floor(SAMPLE_RATE / MIN_HZ); //  686 @ 48k,  70 Hz
    const nsdf   = new Float32Array(maxLag + 1);

    for (let tau = minLag; tau <= maxLag; tau++) {
      let acf = 0, m = 0;
      const n = WINDOW_SIZE - tau;
      for (let i = 0; i < n; i++) {
        acf += frame[i] * frame[i + tau];
        m   += frame[i] * frame[i] + frame[i + tau] * frame[i + tau];
      }
      nsdf[tau] = m < 1e-10 ? 0 : (2 * acf) / m;
    }

    // ── Collect ALL peaks above threshold ────────────────────────────────────
    // A peak is a local maximum where nsdf[tau] >= CLARITY_THRESH.
    // We scan for sign changes (negative→positive→negative) in the NSDF.
    const peaks = []; // { tau, val }

    let prevSign  = Math.sign(nsdf[minLag]);
    let localMax  = -Infinity;
    let localTau  = -1;

    for (let tau = minLag + 1; tau <= maxLag; tau++) {
      const v    = nsdf[tau];
      const sign = Math.sign(v);

      if (sign > 0 && prevSign <= 0) {
        // Rising zero-crossing — start of a new positive lobe
        localMax = v;
        localTau = tau;
      } else if (sign > 0) {
        if (v > localMax) { localMax = v; localTau = tau; }
      } else if (sign <= 0 && prevSign > 0) {
        // Falling zero-crossing — end of lobe; record if above threshold
        if (localMax >= CLARITY_THRESH && localTau >= 0)
          peaks.push({ tau: localTau, val: localMax });
        localMax = -Infinity;
        localTau = -1;
      }
      prevSign = sign;
    }
    // Catch any lobe that extends to maxLag without a final zero crossing
    if (localMax >= CLARITY_THRESH && localTau >= 0)
      peaks.push({ tau: localTau, val: localMax });

    if (peaks.length === 0) {
      this._resetMedian();
      return { hz: 0, clarity: 0 };
    }

    // ── Pick the peak at the LARGEST lag = lowest frequency = fundamental ────
    // Among all qualifying peaks, the one with the highest lag is the
    // fundamental period. Shorter lags are harmonics (integer sub-multiples).
    let best = peaks[0];
    for (const p of peaks) {
      if (p.tau > best.tau) best = p;
    }

    // Parabolic interpolation
    const { tau: t, val: clarity } = best;
    const y0 = nsdf[Math.max(minLag,    t - 1)];
    const y1 = nsdf[t];
    const y2 = nsdf[Math.min(maxLag, t + 1)];
    const d  = 2 * (2 * y1 - y0 - y2);
    const dt = d !== 0 ? (y0 - y2) / d : 0;
    const hz = SAMPLE_RATE / (t + dt);

    if (hz < MIN_HZ || hz > MAX_HZ) {
      this._resetMedian();
      return { hz: 0, clarity };
    }

    // Median filter
    this._med[this._mIdx % 3] = hz;
    this._mIdx++;
    this._mFill = Math.min(this._mFill + 1, 3);
    const filled = Array.from(this._med.subarray(0, this._mFill)).sort((a, b) => a - b);
    const median = filled[Math.floor(filled.length / 2)];

    return { hz: median, clarity };
  }

  _resetMedian() {
    this._med.fill(0);
    this._mIdx  = 0;
    this._mFill = 0;
  }
}

registerProcessor("pitch-processor", PitchProcessor);
