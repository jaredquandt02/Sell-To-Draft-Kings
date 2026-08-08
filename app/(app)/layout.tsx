import { NavBar } from "@/components/app/NavBar";
import { isSupabaseConfigured } from "@/lib/config";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isSupabaseConfigured();

  return (
    <div className="min-h-screen">
      <NavBar />
      {!configured ? (
        <div className="mx-auto max-w-5xl px-6 py-3">
          <p className="rounded-md bg-yellow-50 px-3 py-1.5 text-xs text-yellow-800">
            Demo mode — set NEXT_PUBLIC_SUPABASE_URL and keys to wire live data.
          </p>
        </div>
      ) : null}
      <main className="mx-auto max-w-5xl px-6 pb-16 pt-6">{children}</main>
    </div>
  );
}
