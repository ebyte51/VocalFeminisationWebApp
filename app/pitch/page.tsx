import { Suspense } from "react";
import AppShell from "@/components/AppShell";
import PitchReaderPage from "@/components/pages/PitchReaderPage";
export default function Page() {
  return (
    <AppShell>
      <Suspense fallback={<div className="flex items-center justify-center h-screen text-gray-400">Loading…</div>}>
        <PitchReaderPage />
      </Suspense>
    </AppShell>
  );
}
