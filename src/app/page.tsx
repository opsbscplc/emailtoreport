export default function Home() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2">Welcome</h2>
        <p>Sign in with Google and sync Gmail label "PDB Notifications".</p>
        <div className="mt-4 flex gap-3">
          <a className="underline" href="/api/auth/signin">Sign in</a>
          <form action="/api/sync" method="post">
            <button className="rounded bg-black text-white px-3 py-1 text-sm" type="submit">Sync Now</button>
          </form>
        </div>
      </div>
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2">Views</h2>
        <ul className="list-disc pl-5 text-sm space-y-1">
          <li><a href="/daily" className="text-blue-600 hover:underline">Daily</a>: total hours and incidents</li>
          <li><a href="/weekly" className="text-blue-600 hover:underline">Weekly</a>: current week summary with daily breakdown</li>
          <li><a href="/monthly" className="text-blue-600 hover:underline">Monthly</a>: total hours and breakdown</li>
          <li><a href="/yearly" className="text-blue-600 hover:underline">Yearly</a>: total hours and breakdown</li>
        </ul>
      </div>
    </div>
  );
}
