'use client';

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
        <Link href="/" className="font-semibold">Email to Report</Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/daily" className="hover:underline">Daily</Link>
          <Link href="/weekly" className="hover:underline">Weekly</Link>
          <Link href="/monthly" className="hover:underline">Monthly</Link>
          <Link href="/yearly" className="hover:underline">Yearly</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {status === "loading" ? (
            <span className="text-gray-500">Loading...</span>
          ) : session ? (
            <>
              <span className="text-green-600">
                ✓ Logged in as {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-red-600 hover:underline"
              >
                Sign out
              </button>
            </>
          ) : (
            <a href="/api/auth/signin" className="text-blue-600 underline">
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
