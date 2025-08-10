'use client';

import { format, getDaysInMonth, startOfMonth } from 'date-fns';
import { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface MonthlyData {
  totalHours: number;
  totalMinutes: number;
  outages: any[];
  scope: string;
  month?: number;
  year?: number;
}

export default function MonthlyPage() {
  const [data, setData] = useState<MonthlyData>({ totalHours: 0, totalMinutes: 0, outages: [], scope: 'monthly' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMonthly = async () => {
      try {
        const res = await fetch('/api/stats?scope=monthly', { cache: 'no-store' });
        if (res.ok) {
          const result = await res.json();
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch monthly stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMonthly();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="rounded-xl border p-6">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/6"></div>
        </div>
        <div className="rounded-xl border p-6">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }
  // Process data for chart
  const currentDate = new Date();
  const currentYear = data.year || currentDate.getFullYear();
  const currentMonth = data.month || (currentDate.getMonth() + 1);
  const daysInMonth = getDaysInMonth(new Date(currentYear, currentMonth - 1));
  
  // Create daily aggregation
  const dailyData = Array(daysInMonth).fill(0);
  
  data.outages.forEach((outage: any) => {
    const outageDate = new Date(outage.start);
    const day = outageDate.getDate() - 1; // 0-indexed
    if (day >= 0 && day < daysInMonth) {
      dailyData[day] += (outage.durationMinutes || 0) / 60; // Convert to hours
    }
  });

  // Generate vibrant colors for each day
  const colors = dailyData.map((_, index) => {
    const hue = (index * 137.508) % 360; // Golden angle for even distribution
    return `hsl(${hue}, 70%, 60%)`;
  });

  const chartData = {
    labels: Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`),
    datasets: [
      {
        label: 'Load Shedding Hours',
        data: dailyData,
        backgroundColor: colors,
        borderColor: colors.map(color => color.replace('60%', '50%')),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Hide legend since each bar has different color
      },
      title: {
        display: true,
        text: `Daily Load Shedding - ${format(new Date(currentYear, currentMonth - 1), 'MMMM yyyy')}`,
        font: {
          size: 16,
          weight: 'bold' as const,
        },
        color: '#374151',
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const day = parseInt(context.label);
            const hours = context.parsed.y;
            const dayOutages = data.outages.filter((o: any) => 
              new Date(o.start).getDate() === day
            );
            return [
              `${hours.toFixed(2)} hours`,
              `${dayOutages.length} outage${dayOutages.length !== 1 ? 's' : ''}`
            ];
          },
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: 'Day of Month',
          font: {
            weight: 'bold' as const,
          },
          color: '#6B7280',
        },
        grid: {
          display: false,
        },
        ticks: {
          color: '#6B7280',
        },
      },
      y: {
        title: {
          display: true,
          text: 'Hours',
          font: {
            weight: 'bold' as const,
          },
          color: '#6B7280',
        },
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          color: '#6B7280',
          callback: (value: any) => `${value}h`,
        },
      },
    },
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="font-semibold mb-2 text-xl text-gradient-sunset">Monthly Summary</h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-2xl font-bold text-gradient-blue">{data.totalHours} hours</p>
            <p className="text-sm text-gradient-purple">Total Load Shedding</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gradient-green">{data.outages.length}</p>
            <p className="text-sm text-gradient-blue">Total Outages</p>
          </div>
          <div>
            <p className="text-lg font-semibold text-gradient-orange">{Math.round(data.totalMinutes / data.outages.length || 0)} min</p>
            <p className="text-sm text-gradient-red">Avg Duration</p>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="rounded-xl border p-6 bg-white shadow-sm">
        <div className="h-96 mb-4">
          <Bar data={chartData} options={chartOptions} />
        </div>
        <div className="flex items-center justify-between text-sm mt-4">
          <p className="text-gradient-blue">💡 Hover over bars to see detailed information</p>
          <p className="text-gradient-purple">🎨 Each day has a unique color for easy identification</p>
        </div>
      </div>

      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-4 text-lg text-gradient-primary">Detailed Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b-2 border-gray-200">
                <th className="py-3 px-2 font-semibold text-gradient-blue">Date</th>
                <th className="py-3 px-2 font-semibold text-gradient-red">Down Time</th>
                <th className="py-3 px-2 font-semibold text-gradient-green">Up Time</th>
                <th className="py-3 px-2 font-semibold text-gradient-purple">Duration</th>
              </tr>
            </thead>
            <tbody>
              {data.outages.map((o: any, index: number) => (
                <tr key={o.start} className={`border-t hover:bg-gray-50 ${index % 2 === 0 ? 'bg-gray-25' : ''}`}>
                  <td className="py-3 px-2 font-medium text-gradient-blue">{format(new Date(o.start), 'MMM dd, yyyy')}</td>
                  <td className="py-3 px-2 text-gradient-red">{format(new Date(o.start), 'HH:mm')}</td>
                  <td className="py-3 px-2 text-gradient-green">{o.end ? format(new Date(o.end), 'HH:mm') : 'Ongoing'}</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-gradient-purple">
                      {o.durationMinutes ? `${Math.floor(o.durationMinutes / 60)}h ${o.durationMinutes % 60}m` : '-'}
                    </span>
                  </td>
                </tr>
              ))}
              {data.outages.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gradient-green">
                    🎉 No outages recorded this month!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


