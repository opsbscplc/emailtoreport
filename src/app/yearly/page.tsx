'use client';

import { format } from 'date-fns';
import { useState, useEffect } from 'react';

const MONTHS = [
  { num: 1, name: 'January', short: 'Jan' },
  { num: 2, name: 'February', short: 'Feb' },
  { num: 3, name: 'March', short: 'Mar' },
  { num: 4, name: 'April', short: 'Apr' },
  { num: 5, name: 'May', short: 'May' },
  { num: 6, name: 'June', short: 'Jun' },
  { num: 7, name: 'July', short: 'Jul' },
  { num: 8, name: 'August', short: 'Aug' },
  { num: 9, name: 'September', short: 'Sep' },
  { num: 10, name: 'October', short: 'Oct' },
  { num: 11, name: 'November', short: 'Nov' },
  { num: 12, name: 'December', short: 'Dec' },
];

async function fetchYearly(filterMonth?: number) {
  try {
    const baseUrl = window.location.origin;
    const monthParam = filterMonth ? `&filterMonth=${filterMonth}` : '';
    const res = await fetch(`${baseUrl}/api/stats?scope=yearly&year=2025${monthParam}`, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch yearly stats:', error);
    return { totalHours: 0, totalMinutes: 0, outages: [], scope: 'yearly' };
  }
}

export default function YearlyPage() {
  const [data, setData] = useState<any>({ totalHours: 0, totalMinutes: 0, outages: [], scope: 'yearly' });
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await fetchYearly(selectedMonth || undefined);
      setData(result);
      setLoading(false);
    }
    loadData();
  }, [selectedMonth]);

  const handleMonthClick = (monthNum: number) => {
    if (selectedMonth === monthNum) {
      // If clicking the same month, show all data
      setSelectedMonth(null);
    } else {
      setSelectedMonth(monthNum);
    }
  };

  const getDisplayTitle = () => {
    if (selectedMonth) {
      const month = MONTHS.find(m => m.num === selectedMonth);
      return `${month?.name} ${data.year || '2025'}`;
    }
    return `Yearly Summary - ${data.year || '2025'}`;
  };

  const getDateRange = () => {
    if (selectedMonth && data.monthStart && data.monthEnd) {
      return `${new Date(data.monthStart).toLocaleDateString()} - ${new Date(data.monthEnd).toLocaleDateString()}`;
    } else if (data.yearStart && data.yearEnd) {
      return `${new Date(data.yearStart).toLocaleDateString()} - ${new Date(data.yearEnd).toLocaleDateString()}`;
    }
    return '';
  };
  return (
    <div className="space-y-6">
      {/* Summary Section */}
      <div className="rounded-xl border p-6">
        <h2 className="font-semibold mb-2 text-gradient-rainbow">{getDisplayTitle()}</h2>
        <p className="text-gradient-blue">Total: <span className="text-gradient-sunset">{data.totalHours} hours</span></p>
        {getDateRange() && (
          <p className="text-sm text-gradient-purple">
            Range: {getDateRange()}
          </p>
        )}
      </div>

      {/* Month Pagination */}
      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-4 text-gradient-primary">Filter by Month</h3>
        <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
          {MONTHS.map((month) => (
            <button
              key={month.num}
              onClick={() => handleMonthClick(month.num)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedMonth === month.num
                  ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'
              }`}
              disabled={loading}
            >
              {month.short}
            </button>
          ))}
        </div>
        {selectedMonth && (
          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gradient-blue">
              Showing data for {MONTHS.find(m => m.num === selectedMonth)?.name} 2025
            </p>
            <button
              onClick={() => setSelectedMonth(null)}
              className="text-sm text-gradient-red hover:text-gradient-orange transition-colors"
            >
              Show All Months
            </button>
          </div>
        )}
      </div>

      {/* Data Table */}
      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-2 text-gradient-primary">
          {selectedMonth ? `${MONTHS.find(m => m.num === selectedMonth)?.name} Breakdown` : 'Yearly Breakdown'}
        </h3>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-3 text-gradient-blue">Loading data...</span>
          </div>
        ) : data.outages.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gradient-purple">
              {selectedMonth 
                ? `No outages recorded for ${MONTHS.find(m => m.num === selectedMonth)?.name} 2025`
                : 'No outages recorded for 2025'
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  <tr key={o.start} className="border-t hover:bg-gray-50">
                    <td className="py-2 text-gradient-blue">{format(new Date(o.start), 'PP')}</td>
                    <td className="text-gradient-red">{format(new Date(o.start), 'pp')}</td>
                    <td className="text-gradient-green">{o.end ? format(new Date(o.end), 'pp') : '-'}</td>
                    <td className="text-gradient-purple">{o.durationMinutes ?? '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


