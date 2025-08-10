import { format, startOfWeek, endOfWeek } from 'date-fns';

async function fetchWeekly() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/stats?scope=weekly`, { cache: 'no-store' });
  return res.json();
}

export default async function WeeklyPage() {
  const data = await fetchWeekly();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  
  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2">Weekly Summary</h2>
        <p className="text-sm text-gray-600 mb-2">
          Week of {format(weekStart, 'PP')} - {format(weekEnd, 'PP')}
        </p>
        <p>Total Load Shedding: <span className="font-semibold">{data.totalHours} hours</span></p>
        <p className="text-sm text-gray-600">({data.totalMinutes} minutes total)</p>
      </div>
      
      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-2">This Week's Outages</h3>
        {data.outages.length === 0 ? (
          <p className="text-gray-500 text-sm">No outages recorded this week.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2">Date</th>
                <th>Down Time</th>
                <th>Up Time</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.outages.map((o: any) => (
                <tr key={o.start} className="border-t">
                  <td className="py-2">{format(new Date(o.start), 'EEE, MMM dd')}</td>
                  <td>{format(new Date(o.start), 'HH:mm')}</td>
                  <td>{o.end ? format(new Date(o.end), 'HH:mm') : 'Ongoing'}</td>
                  <td>
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
        <h3 className="font-semibold mb-2">Daily Breakdown</h3>
        <div className="grid grid-cols-7 gap-2 text-xs">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => {
            const dayOutages = data.dailyBreakdown?.[index] || { hours: 0, count: 0 };
            return (
              <div key={day} className="text-center p-2 bg-gray-50 rounded">
                <div className="font-medium">{day}</div>
                <div className="text-gray-600">{dayOutages.hours}h</div>
                <div className="text-gray-500">{dayOutages.count} outages</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
