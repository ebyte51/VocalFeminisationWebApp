"use client";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

interface Props {
  title?: string;
  backHref?: string;   // explicit back target, e.g. "/techniques"
  backLabel?: string;  // label for the back link, e.g. "Techniques"
  showHome?: boolean;  // show a home button on the right
}

/**
 * Slim page header with an optional back button (left) and home button (right).
 * Used on pages that aren't in the bottom nav — technique detail, settings, etc.
 */
export default function PageHeader({ title, backHref, backLabel = "Back", showHome = false }: Props) {
  const router = useRouter();

  function goBack() {
    // Try the browser history first so we land on the right scroll position.
    // Fall back to the explicit href if there's no history (e.g. deep link).
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  }

  return (
    <div className="flex items-center gap-2 px-4 pt-4 pb-2 min-h-[48px]">
      {/* Back */}
      <button
        type="button"
        onClick={goBack}
        className="flex items-center gap-1 text-flag-blue font-semibold text-sm touch-target -ml-1 pr-2"
        aria-label={`Go back to ${backLabel}`}
      >
        <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {backLabel}
      </button>

      {/* Title — centred in remaining space */}
      {title && (
        <p className="flex-1 text-center text-sm font-semibold text-navy dark:text-white truncate">
          {title}
        </p>
      )}
      {!title && <span className="flex-1" />}

      {/* Home */}
      {showHome ? (
        <Link
          href="/"
          className="flex items-center justify-center w-9 h-9 rounded-xl text-gray-400 hover:text-navy dark:hover:text-white touch-target"
          aria-label="Go to home"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 12l9-9 9 9M5 10v9a1 1 0 001 1h4v-5h4v5h4a1 1 0 001-1v-9" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      ) : (
        /* Placeholder to keep title centred when no home button */
        <span className="w-9" />
      )}
    </div>
  );
}
