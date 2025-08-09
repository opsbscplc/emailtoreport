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
          <li>Daily: total hours and incidents</li>
          <li>Monthly: total hours and breakdown</li>
          <li>Yearly: total hours and breakdown</li>
        </ul>
      </div>
    </div>
  );
}
