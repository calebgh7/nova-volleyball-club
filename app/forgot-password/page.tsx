"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      console.error("resetPasswordForEmail error:", error);
      const msg = (error.message || "").trim();
      setError(
        msg && msg !== "{}"
          ? msg
          : "We couldn't send the reset email. The email service may not be set up correctly yet — please try again shortly or contact the club."
      );
      setLoading(false);
      return;
    }
    setSent(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-nova-purple px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center">
          <Logo size={56} />
          <h1 className="mt-3 text-xl font-bold text-nova-deep">
            Reset password
          </h1>
        </div>

        {sent ? (
          <p className="text-center text-sm text-gray-700">
            If an account exists for that email, we&apos;ve sent a reset link.
            Check your inbox, then follow the link to choose a new password.
            <br />
            <Link
              href="/login"
              className="mt-4 inline-block font-semibold text-nova-violet"
            >
              Back to log in
            </Link>
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <p className="mb-4 text-sm text-gray-600">
              Enter your email and we&apos;ll send you a link to reset your
              password.
            </p>

            {error && (
              <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <label className="mb-1 block text-sm font-medium text-nova-deep">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-nova-violet focus:outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-nova-deep py-2.5 font-semibold text-white transition hover:bg-nova-violet disabled:opacity-60"
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>

            <p className="mt-4 text-center text-sm text-gray-600">
              Remembered it?{" "}
              <Link href="/login" className="font-semibold text-nova-violet">
                Log in
              </Link>
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
