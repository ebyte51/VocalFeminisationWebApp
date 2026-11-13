"use client";

/**
 * Accessible toggle switch.
 * Uses a plain <div> row — no wrapping <label> — so the button click
 * doesn't double-fire via label propagation.
 */
export default function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy dark:text-white">{label}</p>
        {description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-flag-blue ${
          checked ? "bg-flag-blue" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`absolute top-1 left-0 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
