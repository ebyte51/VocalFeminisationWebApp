"use client";
import { useEffect, useState, useRef } from "react";
import { buildRoutine, getShuffleCounter, incrementShuffle } from "@/lib/warmupRotation";
import warmupsData from "@/data/warmups.json";
import type { WarmupItem } from "@/lib/types";

const allWarmups = warmupsData as WarmupItem[];

export default function WarmupsPage() {
  const [routine, setRoutine] = useState<WarmupItem[]>([]);
  const [cooldown, setCooldown] = useState<WarmupItem[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const sc = getShuffleCounter();
    const { routine: r, cooldown: c } = buildRoutine(allWarmups, sc);
    setRoutine(r);
    setCooldown(c);
  }, []);

  function shuffle() {
    const next = incrementShuffle();
    const { routine: r, cooldown: c } = buildRoutine(allWarmups, next);
    setRoutine(r);
    setCooldown(c);
    setChecked(new Set());
  }

  function toggle(id: string) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold text-navy dark:text-white">Warm-ups</h1>
        <button
          onClick={shuffle}
          className="flex items-center gap-1.5 text-sm text-flag-blue font-semibold touch-target px-2"
          aria-label="Shuffle warm-up routine"
        >
          <ShuffleIcon className="w-4 h-4" />
          Shuffle
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
        Do the warm-ups consistently. Stop if anything hurts.
      </p>

      <div className="space-y-3">
        {routine.map((item) => (
          <WarmupCard key={item.id} item={item} checked={checked.has(item.id)} onToggle={() => toggle(item.id)} />
        ))}
      </div>

      {/* Cooldown */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-navy dark:text-white mb-1">Cooldown</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          As always, warm down. A few minutes to settle the voice.
        </p>
        <div className="space-y-3">
          {cooldown.map((item) => (
            <WarmupCard key={item.id} item={item} checked={checked.has(item.id)} onToggle={() => toggle(item.id)} />
          ))}
        </div>
      </div>

      <div className="mt-8 bg-gray-100 dark:bg-gray-800 rounded-xl p-3 text-sm text-gray-600 dark:text-gray-300 text-center">
        Stop if anything hurts, feels strained, or leaves your voice hoarse.
      </div>
    </div>
  );
}

function WarmupCard({ item, checked, onToggle }: { item: WarmupItem; checked: boolean; onToggle: () => void }) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startTimer() {
    if (!item.timerSeconds) return;
    setTimeLeft(item.timerSeconds);
    setRunning(true);
  }

  useEffect(() => {
    if (running && timeLeft !== null) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((t) => {
          if (t === null || t <= 1) {
            setRunning(false);
            clearInterval(intervalRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, timeLeft]);

  return (
    <div
      className={`rounded-2xl border transition-opacity ${
        checked
          ? "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-50"
          : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
      }`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          className="mt-0.5 w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center"
          style={{
            borderColor: checked ? "#F5A9B8" : "#9ca3af",
            backgroundColor: checked ? "#F5A9B8" : "transparent",
          }}
          aria-label={checked ? `Unmark ${item.title} as done` : `Mark ${item.title} as done`}
          aria-pressed={checked}
        >
          {checked && (
            <svg className="w-3.5 h-3.5 text-navy" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={`font-semibold text-sm ${checked ? "line-through text-gray-400" : "text-navy dark:text-white"}`}>
              {item.title}
            </p>
            {(item.timerSeconds || item.reps) && (
              <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                {item.timerSeconds ? `${item.timerSeconds}s` : ""}
                {item.timerSeconds && item.reps ? " × " : ""}
                {item.reps ? `×${item.reps}` : ""}
              </span>
            )}
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
            {item.instructions}
          </p>

          {item.tip && (
            <div className="mt-2 bg-tint-blue rounded-lg px-3 py-2 text-sm text-navy">
              💡 {item.tip}
            </div>
          )}

          {/* Timer */}
          {item.timerSeconds && (
            <div className="mt-2 flex items-center gap-2">
              {running ? (
                <div className="flex items-center gap-2 text-sm font-mono text-navy font-semibold">
                  <span>{timeLeft}s</span>
                  <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-flag-blue transition-all"
                      style={{ width: `${((timeLeft ?? 0) / item.timerSeconds) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={startTimer}
                  className="text-sm text-flag-blue font-semibold touch-target"
                >
                  ⏱ Start {item.timerSeconds}s timer
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ShuffleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="16 3 21 3 21 8" />
      <line x1="4" y1="20" x2="21" y2="3" />
      <polyline points="21 16 21 21 16 21" />
      <line x1="15" y1="15" x2="21" y2="21" />
    </svg>
  );
}
