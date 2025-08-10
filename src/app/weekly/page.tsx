import { format, startOfWeek, endOfWeek } from 'date-fns';

async function fetchWeekly() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/stats?scope=weekly`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch weekly stats:', error);
    return { totalHours: 0, totalMinutes: 0, outages: [], dailyBreakdown: Array(7).fill({ hours: 0, count: 0 }), scope: 'weekly' };
  }
}

export default async function WeeklyPage() {
  const data = await fetchWeekly();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Sunday
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Saturday
  
  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2 text-gradient-sunset">Weekly Summary</h2>
        <p className="text-sm text-gradient-blue mb-2">
          Week of {format(weekStart, 'PP')} - {format(weekEnd, 'PP')}
        </p>
        <p className="text-gradient-purple">Total Load Shedding: <span className="font-semibold text-gradient-rainbow">{data.totalHours} hours</span></p>
        <p className="text-sm text-gradient-orange">({data.totalMinutes} minutes total)</p>
      </div>
      
      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-2 text-gradient-primary">This Week's Outages</h3>
        {data.outages.length === 0 ? (
          <p className="text-gradient-green text-sm">No outages recorded this week.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 text-gradient-blue">Date</th>
                <th className="text-gradient-red">Down Time</th>
                <th className="text-gradient-green">Up Time</th>
                <th className="text-gradient-purple">Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.outages.map((o: any) => (
                <tr key={o.start} className="border-t">
                  <td className="py-2 text-gradient-blue">{format(new Date(o.start), 'EEE, MMM dd')}</td>
                  <td className="text-gradient-red">{format(new Date(o.start), 'HH:mm')}</td>
                  <td className="text-gradient-green">{o.end ? format(new Date(o.end), 'HH:mm') : 'Ongoing'}</td>
                  <td className="text-gradient-purple">
                    {o.durationMinutes 
                      ? `${Math.floor(o.durationMinutes / 60)}h ${o.durationMinutes % 60}m`
                      : '-'
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-2 text-gradient-rainbow">Daily Breakdown</h3>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => {
            const dayOutages = data.dailyBreakdown?.[index] || { hours: 0, count: 0 };
            return (
              <div key={day} className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium">{day}</div>
                <div className="text-gradient-blue">{dayOutages.hours}h</div>
                <div className="text-gradient-purple">{dayOutages.count} outages</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
