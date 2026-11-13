"use client";
import { useRouter } from "next/navigation";
import { useSettingsStore } from "@/lib/store";
import { deleteAllRecordings } from "@/lib/db";
import Toggle from "@/components/Toggle";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, setSettings } = useSettingsStore();

  function handleToggle(key: keyof typeof settings, value: boolean) {
    setSettings({ [key]: value } as never);
  }

  async function handleDeleteAll() {
    if (confirm("Delete all recordings? This cannot be undone.")) {
      await deleteAllRecordings();
    }
  }

  function handleReplayWelcome() {
    setSettings({ onboardingDone: false });
    router.push("/welcome");
  }

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-navy dark:text-white">Settings</h1>

      {/* Pitch Reader */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          Pitch Reader
        </h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
          <div className="p-4">
            <Toggle
              label="Highlight example pitches"
              description="Shades E3–G3 in the graph as a visual reference"
              checked={settings.highlightExamplePitches}
              onChange={(v) =>
                setSettings({
                  highlightExamplePitches: v,
                  targetRange: { ...settings.targetRange, mode: v ? "example" : "off" },
                })
              }
            />
          </div>
          <div className="p-4">
            <Toggle
              label="Reference tones"
              description="Allow playing tones by tapping the note ruler"
              checked={settings.referenceTones}
              onChange={(v) => handleToggle("referenceTones", v)}
            />
          </div>
          <SelectRow
            label="Default window"
            description="How much time the graph shows"
            value={String(settings.windowSeconds)}
            options={[
              { value: "10", label: "10 seconds" },
              { value: "20", label: "20 seconds" },
              { value: "30", label: "30 seconds" },
            ]}
            onChange={(v) => setSettings({ windowSeconds: parseInt(v, 10) })}
          />
        </div>
      </section>

      {/* Rest reminder */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          Rest reminder
        </h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
          <div className="p-4">
            <Toggle
              label="Show rest reminders"
              description="A banner after active practice time — supports safe training"
              checked={settings.reminderEnabled}
              onChange={(v) => handleToggle("reminderEnabled", v)}
            />
          </div>
          <SelectRow
            label="Reminder interval"
            description="How often the reminder appears"
            value={String(settings.reminderMinutes)}
            options={[
              { value: "10", label: "10 minutes" },
              { value: "15", label: "15 minutes" },
              { value: "20", label: "20 minutes (default)" },
              { value: "30", label: "30 minutes" },
              { value: "45", label: "45 minutes" },
              { value: "60", label: "60 minutes" },
            ]}
            onChange={(v) => setSettings({ reminderMinutes: parseInt(v, 10) })}
          />
        </div>
      </section>

      {/* Appearance */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          Appearance
        </h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl divide-y divide-gray-100 dark:divide-gray-700">
          <SelectRow
            label="Colour scheme"
            value={settings.appearance}
            options={[
              { value: "system", label: "System default" },
              { value: "light", label: "Light" },
              { value: "dark", label: "Dark" },
            ]}
            onChange={(v) => setSettings({ appearance: v as "light" | "dark" | "system" })}
          />
          <div className="p-4">
            <Toggle
              label="Reduced motion"
              description="Slows or pauses graph animations"
              checked={settings.reducedMotion}
              onChange={(v) => handleToggle("reducedMotion", v)}
            />
          </div>
        </div>
      </section>

      {/* Data */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-3">
          Data
        </h2>
        <div className="space-y-2">
          <button
            onClick={handleReplayWelcome}
            className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 text-left text-sm text-navy dark:text-white touch-target"
          >
            Replay welcome screens
          </button>
          <button
            onClick={handleDeleteAll}
            className="w-full bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-left text-sm text-red-600 dark:text-red-400 touch-target"
          >
            Delete all recordings
          </button>
        </div>
      </section>

      <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
        All data is stored on your device. Nothing is uploaded.
      </p>
    </div>
  );
}

function SelectRow({
  label,
  description,
  value,
  options,
  onChange,
}: {
  label: string;
  description?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-3 p-4">
      <div className="flex-1">
        <p className="text-sm font-medium text-navy dark:text-white">{label}</p>
        {description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm bg-gray-100 dark:bg-gray-700 text-navy dark:text-white rounded-lg px-2 py-1.5 border-none focus:outline-none focus:ring-2 focus:ring-flag-blue"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}
