import { format } from 'date-fns';

async function fetchYearly() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stats?scope=yearly&year=2025`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch yearly stats:', error);
    return { totalHours: 0, totalMinutes: 0, outages: [], scope: 'yearly' };
  }
}

export default async function YearlyPage() {
  const data = await fetchYearly();
  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2 text-gradient-rainbow">Yearly Summary - {data.year || '2025'}</h2>
        <p className="text-gradient-blue">Total: <span className="text-gradient-sunset">{data.totalHours} hours</span></p>
        {data.yearStart && data.yearEnd && (
          <p className="text-sm text-gradient-purple">
            Range: {new Date(data.yearStart).toLocaleDateString()} - {new Date(data.yearEnd).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-2 text-gradient-primary">Breakdown</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="py-2 text-gradient-blue">Date</th>
              <th className="text-gradient-red">Down Time</th>
              <th className="text-gradient-green">Up Time</th>
              <th className="text-gradient-purple">Duration (min)</th>
            </tr>
          </thead>
          <tbody>
            {data.outages.map((o: any) => (
              <tr key={o.start} className="border-t">
                <td className="py-2 text-gradient-blue">{format(new Date(o.start), 'PP')}</td>
                <td className="text-gradient-red">{format(new Date(o.start), 'pp')}</td>
                <td className="text-gradient-green">{o.end ? format(new Date(o.end), 'pp') : '-'}</td>
                <td className="text-gradient-purple">{o.durationMinutes ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


