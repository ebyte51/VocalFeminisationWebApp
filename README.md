# Voice Trainer

A personal voice training companion for vocal feminisation practice.

## Features

- **Pitch Reader** — live pitch graph, note ruler, record and playback
- **Warm-ups** — rotating daily routine from your session notes, with timers
- **Techniques** — all 10 exercises with steps, explanations and phrases
- **Practice** — 10–30 second rule timer, everyday phrases, scenario cards
- **Foundations** — voice care and core concepts
- **Resonance calibration** — calibrate the quadrant to your own voice
- **Practice log** — record how each session felt
- **PWA** — installs on your phone and works offline

## Deploying to Vercel

1. Push this folder to a GitHub repository.
2. Go to [vercel.com](https://vercel.com) and import the repository.
3. Framework preset: **Next.js** (auto-detected).
4. No environment variables needed.
5. Deploy.

The app uses COOP/COEP headers (required for `AudioWorklet`) — these are set in `vercel.json`.

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Privacy

All audio is processed on-device. Nothing is uploaded. Recordings are stored in IndexedDB in your browser.

## Notes

- Microphone permission is requested the first time you open the Pitch Reader.
- Use headphones when playing reference tones to avoid audio feedback.
- The resonance quadrant needs calibration before it shows readings.
