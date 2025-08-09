import { format } from 'date-fns';

async function fetchYearly() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/stats?scope=yearly`, { cache: 'no-store' });
  return res.json();
}

export default async function YearlyPage() {
  const data = await fetchYearly();
  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2">Yearly Summary</h2>
        <p>Total: {data.totalHours} hours</p>
      </div>
      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-2">Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2">Date</th>
              <th>Down Time</th>
              <th>Up Time</th>
              <th>Duration (min)</th>
            </tr>
          </thead>
          <tbody>
            {data.outages.map((o: any) => (
              <tr key={o.start} className="border-t">
                <td className="py-2">{format(new Date(o.start), 'PP')}</td>
                <td>{format(new Date(o.start), 'pp')}</td>
                <td>{o.end ? format(new Date(o.end), 'pp') : '-'}</td>
                <td>{o.durationMinutes ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


