"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useSettingsStore } from "@/lib/store";

const NAV_ITEMS = [
  { href: "/warmups", label: "Warm-ups", icon: SunIcon },
  { href: "/techniques", label: "Techniques", icon: MicIcon },
  { href: "/pitch", label: "Pitch", icon: WaveIcon },
  { href: "/practice", label: "Practice", icon: StarIcon },
  { href: "/more", label: "More", icon: GridIcon },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings, loadSettings } = useSettingsStore();

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!settings.onboardingDone && pathname !== "/welcome") {
      router.replace("/welcome");
    }
  }, [settings.onboardingDone, pathname, router]);

  // Apply dark mode class
  useEffect(() => {
    const root = document.documentElement;
    if (settings.appearance === "dark") {
      root.classList.add("dark");
    } else if (settings.appearance === "light") {
      root.classList.remove("dark");
    } else {
      // system
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }
  }, [settings.appearance]);

  const isFullscreen =
    pathname === "/welcome" ||
    pathname === "/pitch" ||
    pathname.startsWith("/calibrate");

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto relative">
      {/* Flag stripe */}
      <div className="flag-stripe" />

      {/* Page content */}
      <main
        className={`flex-1 overflow-y-auto ${isFullscreen ? "" : "pb-20"}`}
        style={{ paddingBottom: isFullscreen ? 0 : "calc(5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {children}
      </main>

      {/* Bottom navigation */}
      {!isFullscreen && (
        <nav
          className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white dark:bg-navy border-t border-gray-100 dark:border-gray-700 safe-pb z-50"
          aria-label="Main navigation"
        >
          <ul className="flex">
            {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href} className="flex-1">
                  <Link
                    href={href}
                    className={`flex flex-col items-center justify-center py-2 touch-target text-xs font-medium transition-colors ${
                      active
                        ? "text-navy bg-tint-pink dark:text-white"
                        : "text-gray-500 dark:text-gray-400 hover:text-navy dark:hover:text-white"
                    }`}
                    aria-current={active ? "page" : undefined}
                  >
                    <Icon
                      className={`w-5 h-5 mb-0.5 ${active ? "text-flag-pink" : ""}`}
                      aria-hidden="true"
                    />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8" />
    </svg>
  );
}

function WaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M2 12h2l3-7 4 14 3-9 2 4 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <circle cx="5" cy="5" r="1.5" fill="currentColor" />
      <circle cx="12" cy="5" r="1.5" fill="currentColor" />
      <circle cx="19" cy="5" r="1.5" fill="currentColor" />
      <circle cx="5" cy="12" r="1.5" fill="currentColor" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" />
      <circle cx="19" cy="12" r="1.5" fill="currentColor" />
      <circle cx="5" cy="19" r="1.5" fill="currentColor" />
      <circle cx="12" cy="19" r="1.5" fill="currentColor" />
      <circle cx="19" cy="19" r="1.5" fill="currentColor" />
    </svg>
  );
}
