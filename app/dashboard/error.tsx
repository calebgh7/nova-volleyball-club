"use client";

// Segment error boundary for the dashboard. Catches unexpected failures
// (e.g. a database/RLS error) and offers a retry instead of a blank page.
export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <h2 className="font-semibold text-red-800">Something went wrong</h2>
      <p className="mt-1 text-sm text-red-700">
        {error.message || "An unexpected error occurred loading this page."}
      </p>
      <button
        onClick={reset}
        className="mt-4 rounded-lg bg-nova-deep px-4 py-2 text-sm font-semibold text-white transition hover:bg-nova-violet"
      >
        Try again
      </button>
    </div>
  );
}
