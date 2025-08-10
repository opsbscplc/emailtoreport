import { format } from 'date-fns';

async function fetchMonthly() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stats?scope=monthly`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch monthly stats:', error);
    return { totalHours: 0, totalMinutes: 0, outages: [], scope: 'monthly' };
  }
}

export default async function MonthlyPage() {
  const data = await fetchMonthly();
  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2">Monthly Summary</h2>
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


