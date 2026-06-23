import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-nova-purple px-6 text-center">
      <Logo size={88} />
      <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-nova-deep">
        NOVA VOLLEYBALL CLUB
      </h1>
      <p className="mt-3 max-w-md text-nova-deep/80">
        Member portal &amp; club operations. Register, view schedules, and stay
        in the loop.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/login"
          className="rounded-lg bg-nova-deep px-6 py-3 font-semibold text-white transition hover:bg-nova-violet"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="rounded-lg bg-nova-sky px-6 py-3 font-semibold text-nova-deep transition hover:bg-white"
        >
          Create account
        </Link>
      </div>
      <p className="mt-10 text-xs text-nova-deep/60">
        Phase 0 app shell · aznova.org
      </p>
    </main>
  );
}
