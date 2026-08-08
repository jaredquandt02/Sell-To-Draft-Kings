import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="p-6 text-sm">Loading…</main>}>
      <LoginForm />
    </Suspense>
  );
}
