'use client';

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center gap-6">
        <Link href="/" className="flex items-center gap-3 font-semibold text-gradient-sunset">
          <img 
            src="https://bsccl.com.bd/uploads/site/logo.webp" 
            alt="BSCCL Logo" 
            className="h-8 w-auto object-contain"
          />
          Email to Report
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/previous-day" className="text-gradient-pink hover:text-gradient-purple transition-all duration-300">Previous Day</Link>
          <Link href="/daily" className="text-gradient-blue hover:text-gradient-purple transition-all duration-300">Daily</Link>
          <Link href="/weekly" className="text-gradient-purple hover:text-gradient-blue transition-all duration-300">Weekly</Link>
          <Link href="/monthly" className="text-gradient-orange hover:text-gradient-red transition-all duration-300">Monthly</Link>
          <Link href="/yearly" className="text-gradient-green hover:text-gradient-blue transition-all duration-300">Yearly</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3 text-sm">
          {status === "loading" ? (
            <span className="text-gradient-primary">Loading...</span>
          ) : session ? (
            <>
              <span className="text-gradient-green">
                ✓ Logged in as {session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="text-gradient-red hover:text-gradient-orange transition-all duration-300"
              >
                Sign out
              </button>
            </>
          ) : (
            <a href="/api/auth/signin" className="text-gradient-blue hover:text-gradient-purple transition-all duration-300">
              Sign in
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
