"use client";
import type { PitchPoint } from "./types";

const POINTS_PER_SECOND = 100; // ~10 ms per point matches ~512-sample hop at 48 kHz

export interface PitchCallback {
  (point: PitchPoint): void;
}

export class PitchReader {
  private ctx: AudioContext | null = null;
  private worklet: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private _onPitch: PitchCallback | null = null;
  private _recording = false;
  private _pitchTrack: PitchPoint[] = [];
  private _startTime = 0;
  public isActive = false;

  async start(onPitch: PitchCallback): Promise<void> {
    this._onPitch = onPitch;

    // iOS Safari requires AudioContext from a user gesture — caller ensures this.
    this.ctx = new AudioContext({ sampleRate: 48000 });

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        sampleRate: 48000,
      },
    });

    await this.ctx.audioWorklet.addModule("/pitch-processor.js");
    this.worklet = new AudioWorkletNode(this.ctx, "pitch-processor");
    this.source = this.ctx.createMediaStreamSource(this.stream);
    this.source.connect(this.worklet);
    this.worklet.port.onmessage = (e) => {
      const pt: PitchPoint = e.data;
      if (this._recording) this._pitchTrack.push(pt);
      this._onPitch?.(pt);
    };
    this.isActive = true;
  }

  async stop(): Promise<void> {
    this.worklet?.port.postMessage("stop");
    this.worklet?.disconnect();
    this.source?.disconnect();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close();
    this.isActive = false;
  }

  startRecording(): void {
    if (!this.stream) return;
    this.chunks = [];
    this._pitchTrack = [];
    this._startTime = Date.now();
    this._recording = true;

    const mime = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/mp4";

    this.mediaRecorder = new MediaRecorder(this.stream, { mimeType: mime });
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start(100);
  }

  stopRecording(): { blob: Blob; mime: string; pitchTrack: PitchPoint[]; durationMs: number } | null {
    if (!this.mediaRecorder || !this._recording) return null;
    this._recording = false;
    const durationMs = Date.now() - this._startTime;
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const mime = this.mediaRecorder!.mimeType;
        const blob = new Blob(this.chunks, { type: mime });
        resolve({ blob, mime, pitchTrack: [...this._pitchTrack], durationMs });
      };
      this.mediaRecorder!.stop();
    }) as unknown as { blob: Blob; mime: string; pitchTrack: PitchPoint[]; durationMs: number };
  }

  async stopRecordingAsync(): Promise<{ blob: Blob; mime: string; pitchTrack: PitchPoint[]; durationMs: number } | null> {
    if (!this.mediaRecorder || !this._recording) return null;
    this._recording = false;
    const durationMs = Date.now() - this._startTime;
    return new Promise((resolve) => {
      this.mediaRecorder!.onstop = () => {
        const mime = this.mediaRecorder!.mimeType;
        const blob = new Blob(this.chunks, { type: mime });
        resolve({ blob, mime, pitchTrack: [...this._pitchTrack], durationMs });
      };
      this.mediaRecorder!.stop();
    });
  }
}

// ─── Reference tones ─────────────────────────────────────────────────────────

let _toneCtx: AudioContext | null = null;
let _toneOsc: OscillatorNode | null = null;
let _toneGain: GainNode | null = null;

export function playTone(hz: number, volumeDb = -12): void {
  stopTone();
  if (!_toneCtx) {
    _toneCtx = new AudioContext();
  }
  if (_toneCtx.state === "suspended") _toneCtx.resume();

  _toneGain = _toneCtx.createGain();
  _toneGain.gain.value = Math.pow(10, volumeDb / 20);
  _toneOsc = _toneCtx.createOscillator();
  _toneOsc.type = "sine";
  _toneOsc.frequency.value = hz;
  _toneOsc.connect(_toneGain);
  _toneGain.connect(_toneCtx.destination);
  _toneOsc.start();
}

export function stopTone(): void {
  try {
    _toneOsc?.stop();
  } catch {}
  _toneOsc?.disconnect();
  _toneGain?.disconnect();
  _toneOsc = null;
  _toneGain = null;
}

export function isTonePlaying(): boolean {
  return _toneOsc !== null;
}
