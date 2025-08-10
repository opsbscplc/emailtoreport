'use client';

import { useSession } from "next-auth/react";

export default function Home() {
  const { data: session, status } = useSession();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2">
          {session ? `Welcome, ${session.user?.email?.split('@')[0]}!` : 'Welcome'}
        </h2>
        {session ? (
          <div>
            <p className="text-green-600 mb-2">✓ Successfully authenticated with Google</p>
            <p className="text-sm text-gray-600 mb-4">
              Ready to sync Gmail label "PDB Notifications" and track load shedding duration.
            </p>
            <form action="/api/sync" method="post">
              <button 
                className="rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors" 
                type="submit"
              >
                🔄 Sync Now
              </button>
            </form>
          </div>
        ) : (
          <div>
            <p className="mb-4">Sign in with Google to sync Gmail label "PDB Notifications" and track load shedding duration.</p>
            <a 
              className="inline-block rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors" 
              href="/api/auth/signin"
            >
              🔑 Sign in with Google
            </a>
          </div>
        )}
      </div>
      
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2">Load Shedding Reports</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li><a href="/daily" className="text-blue-600 hover:underline">Daily</a>: today's outages and total hours</li>
          <li><a href="/weekly" className="text-blue-600 hover:underline">Weekly</a> ⭐: current week with daily breakdown</li>
          <li><a href="/monthly" className="text-blue-600 hover:underline">Monthly</a>: current month summary</li>
          <li><a href="/yearly" className="text-blue-600 hover:underline">Yearly</a>: current year overview</li>
        </ul>
        {session && (
          <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-700">
            <p className="font-medium">💡 How it works:</p>
            <p>We read emails from your "PDB Notifications" Gmail label, parse "PDB Down" and "PDB Up" subjects, and calculate load shedding duration automatically.</p>
          </div>
        )}
      </div>
    </div>
  );
}
