"use client";
import { useEffect, useState } from "react";
import { getSessions, saveSession } from "@/lib/db";
import techniquesData from "@/data/techniques.json";
import type { Session, Technique, Feeling } from "@/lib/types";
import PageHeader from "@/components/PageHeader";

const techniques = techniquesData as Technique[];

export default function LogPage() {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    getSessions().then(setSessions);
  }, []);

  const totalMinutes = Math.round(sessions.reduce((acc, s) => acc + s.activeSeconds, 0) / 60);
  const thisWeek = sessions.filter(
    (s) => s.startedAt > Date.now() - 7 * 24 * 60 * 60 * 1000
  );

  if (sessions.length === 0) {
    return (
      <div className="py-2 pb-6">
        <PageHeader backHref="/more" backLabel="More" showHome />
        <div className="px-4 mt-2">
          <h1 className="text-2xl font-bold text-navy dark:text-white mb-2">Practice log</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sessions you save will appear here. After a recording session, you'll be prompted to log how it went.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="py-2 pb-6 space-y-4">
      <PageHeader backHref="/more" backLabel="More" showHome />
      <div className="px-4 space-y-6">
      <h1 className="text-2xl font-bold text-navy dark:text-white">Practice log</h1>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-tint-blue rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-navy dark:text-white">{thisWeek.length}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">sessions this week</p>
        </div>
        <div className="bg-tint-pink rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-navy dark:text-white">{totalMinutes}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">total minutes</p>
        </div>
      </div>

      {/* Session list */}
      <div className="space-y-3">
        {sessions.map((session) => (
          <SessionCard key={session.id} session={session} onUpdate={(s) => {
            saveSession(s);
            setSessions((prev) => prev.map((x) => x.id === s.id ? s : x));
          }} />
        ))}
      </div>
      </div>
    </div>
  );
}

function SessionCard({ session, onUpdate }: { session: Session; onUpdate: (s: Session) => void }) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(session.note);
  const [feeling, setFeeling] = useState<Feeling | null>(session.feeling);

  const techNames = session.techniqueIds
    .map((id) => techniques.find((t) => t.id === id)?.title)
    .filter(Boolean);

  const duration = Math.round(session.activeSeconds / 60);
  const date = new Date(session.startedAt);

  const feelingEmoji: Record<Feeling, string> = {
    comfortable: "😊",
    tired: "😴",
    strained: "😣",
  };

  function save() {
    onUpdate({ ...session, feeling, note });
    setEditing(false);
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-navy dark:text-white">
            {date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
          </p>
          <p className="text-xs text-gray-400">{duration}m active · {date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</p>
        </div>
        {feeling && (
          <span className="text-lg" aria-label={feeling}>{feelingEmoji[feeling]}</span>
        )}
      </div>

      {techNames.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {techNames.map((name) => (
            <span key={name} className="text-xs bg-tint-blue text-navy/70 rounded-full px-2 py-0.5">{name}</span>
          ))}
        </div>
      )}

      {session.note && (
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 italic">&ldquo;{session.note}&rdquo;</p>
      )}

      {!session.feeling && !editing && (
        <button
          onClick={() => setEditing(true)}
          className="mt-2 text-xs text-flag-blue font-medium touch-target"
        >
          How did it feel?
        </button>
      )}

      {editing && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            {(["comfortable", "tired", "strained"] as Feeling[]).map((f) => (
              <button
                key={f}
                onClick={() => setFeeling(f)}
                className={`flex-1 py-1.5 rounded-xl text-xs font-medium touch-target capitalize ${
                  feeling === f
                    ? "bg-flag-pink text-navy"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                }`}
              >
                {feelingEmoji[f]} {f}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="How did that feel? (optional)"
            className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-xs bg-white dark:bg-gray-700 text-navy dark:text-white resize-none focus:outline-none focus:ring-2 focus:ring-flag-blue"
            rows={2}
          />
          <button
            onClick={save}
            className="w-full bg-flag-blue text-navy text-sm font-semibold rounded-xl py-2 touch-target"
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
}
