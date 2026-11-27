import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";

// AppShell and the pages read the URL (usePathname/useParams), which is only known at
// request time, so they stream in inside Suspense while the static shell is prerendered.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex-1" />}>
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
