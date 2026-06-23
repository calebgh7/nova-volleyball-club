"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-nova-purple px-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg">
        <div className="mb-6 flex flex-col items-center">
          <Logo size={56} />
          <h1 className="mt-3 text-xl font-bold text-nova-deep">
            Create account
          </h1>
        </div>

        {done ? (
          <p className="text-center text-sm text-gray-700">
            Check your email to confirm your account, then{" "}
            <Link href="/login" className="font-semibold text-nova-violet">
              log in
            </Link>
            .
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            {error && (
              <p className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <label className="mb-1 block text-sm font-medium text-nova-deep">
              Full name
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-nova-violet focus:outline-none"
            />

            <label className="mb-1 block text-sm font-medium text-nova-deep">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-nova-violet focus:outline-none"
            />

            <label className="mb-1 block text-sm font-medium text-nova-deep">
              Password
            </label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mb-6 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-nova-violet focus:outline-none"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-nova-deep py-2.5 font-semibold text-white transition hover:bg-nova-violet disabled:opacity-60"
            >
              {loading ? "Creating…" : "Create account"}
            </button>

            <p className="mt-4 text-center text-sm text-gray-600">
              Already have one?{" "}
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
