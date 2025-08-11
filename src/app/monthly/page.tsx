'use client';

import { format, getDaysInMonth, startOfMonth } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
  const [generatingPDF, setGeneratingPDF] = useState(false);

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

  const generatePDF = () => {
    setGeneratingPDF(true);
    
    try {
      // Create new PDF document in A4 landscape format
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // Helper function to check if outage is during router maintenance time (01:00-01:02 AM GMT+6)
      const isRouterMaintenanceTime = (outage: any) => {
        const downTime = toZonedTime(new Date(outage.start), 'Asia/Dhaka');
        const upTime = outage.end ? toZonedTime(new Date(outage.end), 'Asia/Dhaka') : null;
        
        const downHour = downTime.getHours();
        const downMinute = downTime.getMinutes();
        const upHour = upTime ? upTime.getHours() : null;
        const upMinute = upTime ? upTime.getMinutes() : null;
        
        // Check if down time is 01:00, 01:01, or 01:02
        const isDownMaintenanceTime = downHour === 1 && (downMinute === 0 || downMinute === 1 || downMinute === 2);
        
        // Check if up time is 01:00, 01:01, or 01:02
        const isUpMaintenanceTime = upHour === 1 && (upMinute === 0 || upMinute === 1 || upMinute === 2);
        
        // Exclude if both down and up times are within maintenance window
        return isDownMaintenanceTime && isUpMaintenanceTime;
      };
      
      // Filter out router maintenance times for PDF
      const filteredOutages = data.outages.filter((outage: any) => !isRouterMaintenanceTime(outage));

      // Get current month and year
      const currentDate = new Date();
      const monthYear = format(currentDate, 'MMMM yyyy');
      
      // Add title - centered for landscape mode
      const pageWidth = doc.internal.pageSize.getWidth();
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.text('Generator Runtime Log', pageWidth / 2, 20, { align: 'center' });
      
      // Add month/year subtitle - centered
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(monthYear, pageWidth / 2, 28, { align: 'center' });
      
      // Prepare table data using filtered outages
      const tableData = filteredOutages.map((outage: any, index: number) => {
        const runtime = outage.durationMinutes !== undefined ? `${Math.floor(outage.durationMinutes / 60)}h ${outage.durationMinutes % 60}m` : '-';
        const date = format(toZonedTime(new Date(outage.start), 'Asia/Dhaka'), 'dd/MM/yy'); // Changed to DD/MM/YY format
        
        return [
          (index + 1).toString(), // Serial No
          date, // Date (DDMMYY format)
          '', // Fuel(Ltr) - empty for manual entry
          '', // Mobil(Ltr) - empty for manual entry
          format(toZonedTime(new Date(outage.start), 'Asia/Dhaka'), 'HH:mm'), // PDB Down Time
          outage.end ? format(toZonedTime(new Date(outage.end), 'Asia/Dhaka'), 'HH:mm') : '-', // PDB Up Time
          runtime, // Generator Total Runtime
          '', // Generator Name (empty for manual entry)
          'Loadshedding / PDB Maintenance / Others', // Remarks
          '' // Signature (empty for manual entry)
        ];
      });
      
      // Add table with borders
      autoTable(doc, {
        head: [[
          'Serial No',
          'Date',
          'Fuel(Ltr)',
          'Mobil(Ltr)',
          'PDB Down Time',
          'PDB Up Time',
          'Generator Total Runtime',
          'Generator Name',
          'Remarks',
          'Signature'
        ]],
        body: tableData,
        startY: 35,
        theme: 'grid',
        styles: {
          fontSize: 10,
          cellPadding: 3,
          textColor: [0, 0, 0], // Black text
          lineColor: [0, 0, 0], // Black borders
          lineWidth: 0.5,
          font: 'helvetica',
          halign: 'center',
          valign: 'middle'
        },
        headStyles: {
          fillColor: [255, 255, 255], // White background
          textColor: [0, 0, 0], // Black text
          fontStyle: 'bold',
          lineColor: [0, 0, 0], // Black borders
          lineWidth: 0.5
        },
        bodyStyles: {
          fillColor: [255, 255, 255], // White background
          textColor: [0, 0, 0], // Black text
          lineColor: [0, 0, 0], // Black borders
          lineWidth: 0.5
        },
        columnStyles: {
          0: { cellWidth: 18 }, // Serial No
          1: { cellWidth: 22 }, // Date
          2: { cellWidth: 20 }, // Fuel(Ltr)
          3: { cellWidth: 20 }, // Mobil(Ltr)
          4: { cellWidth: 22 }, // PDB Down Time
          5: { cellWidth: 22 }, // PDB Up Time
          6: { cellWidth: 28 }, // Generator Total Runtime
          7: { cellWidth: 28 }, // Generator Name
          8: { cellWidth: 60 }, // Remarks (made wider)
          9: { cellWidth: 25 }  // Signature
        },
        margin: { top: 35, right: 10, bottom: 20, left: 10 },
        didDrawPage: function(data) {
          // Add page number
          const pageCount = doc.getNumberOfPages();
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });
      
      // Save the PDF
      const fileName = `Generator_Runtime_Log_${format(currentDate, 'MMMM_yyyy')}.pdf`;
      doc.save(fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPDF(false);
    }
  };

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
    const outageDate = toZonedTime(new Date(outage.start), 'Asia/Dhaka');
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
              toZonedTime(new Date(o.start), 'Asia/Dhaka').getDate() === day
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
        <div className="flex items-center justify-between">
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
          <button
            onClick={generatePDF}
            disabled={generatingPDF || data.outages.length === 0}
            className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {generatingPDF ? (
              <>
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download PDF
              </>
            )}
          </button>
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
                  <td className="py-3 px-2 font-medium text-gradient-blue">{format(toZonedTime(new Date(o.start), 'Asia/Dhaka'), 'MMM dd, yyyy')}</td>
                  <td className="py-3 px-2 text-gradient-red">{format(toZonedTime(new Date(o.start), 'Asia/Dhaka'), 'HH:mm')}</td>
                  <td className="py-3 px-2 text-gradient-green">{o.end ? format(toZonedTime(new Date(o.end), 'Asia/Dhaka'), 'HH:mm') : 'Ongoing'}</td>
                  <td className="py-3 px-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-gradient-purple">
                      {o.durationMinutes !== undefined ? `${Math.floor(o.durationMinutes / 60)}h ${o.durationMinutes % 60}m` : '-'}
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


