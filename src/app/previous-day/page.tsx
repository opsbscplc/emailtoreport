'use client';

import { format, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { useState, useEffect } from 'react';

interface PreviousDayData {
  totalMinutes: number;
  totalHours: number;
  outages: any[];
  scope: string;
  year: number;
  month: number;
  day: number;
}

async function fetchPreviousDay() {
  try {
    const baseUrl = window.location.origin;
    
    // Get previous day in GMT+6
    const bangladeshTz = 'Asia/Dhaka';
    const now = toZonedTime(new Date(), bangladeshTz);
    const previousDay = subDays(now, 1);
    
    const year = previousDay.getFullYear();
    const month = previousDay.getMonth() + 1; // 1-indexed
    const day = previousDay.getDate();
    
    const res = await fetch(`${baseUrl}/api/stats?scope=daily&year=${year}&month=${month}&day=${day}`, { 
      cache: 'no-store' 
    });
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    console.error('Failed to fetch previous day stats:', error);
    return { totalHours: 0, totalMinutes: 0, outages: [], scope: 'daily' };
  }
}

export default function PreviousDayPage() {
  const [data, setData] = useState<PreviousDayData>({ 
    totalHours: 0, 
    totalMinutes: 0, 
    outages: [], 
    scope: 'daily',
    year: 0,
    month: 0,
    day: 0
  });
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const result = await fetchPreviousDay();
      setData(result);
      setLoading(false);
    }
    loadData();
  }, []);

  const getPreviousDayDate = () => {
    const bangladeshTz = 'Asia/Dhaka';
    const now = toZonedTime(new Date(), bangladeshTz);
    const previousDay = subDays(now, 1);
    return previousDay;
  };

  const generateWhatsAppText = () => {
    const previousDay = getPreviousDayDate();
    const dateStr = format(previousDay, 'dd/MM/yy'); // DD/MM/YY format
    const bangladeshTz = 'Asia/Dhaka';
    
    let text = `Generator Runtime Log: ${dateStr}\n`;
    text += 'Start Time   | End Time   | Duration\n';
    text += '-------------------------------------\n';
    
    if (data.outages.length === 0) {
      text += 'No outages recorded\n';
    } else {
      data.outages.forEach((outage) => {
        const startTime = format(toZonedTime(new Date(outage.start), bangladeshTz), 'hh:mm a').replace(/^0/, '').toUpperCase();
        const endTime = outage.end 
          ? format(toZonedTime(new Date(outage.end), bangladeshTz), 'hh:mm a').replace(/^0/, '').toUpperCase()
          : 'Ongoing';
        const duration = outage.durationMinutes !== undefined ? outage.durationMinutes : 0;
        
        // Format times to ensure consistent spacing - exactly match your format
        const formattedStart = startTime.padEnd(12, ' ');
        const formattedEnd = endTime.padEnd(11, ' ');
        
        text += `${formattedStart} | ${formattedEnd} | ${duration} minutes\n`;
      });
    }
    
    text += `\nTotal Duration: ${data.totalMinutes} minutes\n\n`;
    
    return text;
  };

  const copyToClipboard = async () => {
    try {
      const text = generateWhatsAppText();
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gradient-blue">Loading previous day data...</span>
      </div>
    );
  }

  const previousDay = getPreviousDayDate();
  const bangladeshTz = 'Asia/Dhaka';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border p-6 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold mb-2 text-xl text-gradient-sunset">Previous Day Summary</h2>
            <p className="text-sm text-gradient-blue mb-2">
              {format(previousDay, 'EEEE, MMMM dd, yyyy')} (GMT+6)
            </p>
            <p className="text-gradient-purple">Total Load Shedding: <span className="font-semibold text-gradient-rainbow">{data.totalHours} hours</span></p>
            <p className="text-sm text-gradient-orange">({data.totalMinutes} minutes total)</p>
          </div>
          <div className="text-right">
            <button
              onClick={copyToClipboard}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                copySuccess
                  ? 'bg-green-500 text-white'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
              }`}
            >
              {copySuccess ? '✓ Copied!' : '📋 Copy to Clipboard for WhatsApp'}
            </button>
          </div>
        </div>
      </div>

      {/* Outages Table */}
      <div className="rounded-xl border p-6">
        <h3 className="font-semibold mb-4 text-gradient-primary">Outages Breakdown</h3>
        {data.outages.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">✅</span>
            </div>
            <p className="text-gradient-green">No load shedding yesterday!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-3 px-2 text-gradient-blue">Date</th>
                  <th className="py-3 px-2 text-gradient-red">Down Time</th>
                  <th className="py-3 px-2 text-gradient-green">Up Time</th>
                  <th className="py-3 px-2 text-gradient-purple">Duration</th>
                </tr>
              </thead>
              <tbody>
                {data.outages.map((o: any, index: number) => (
                  <tr key={o.start || index} className="border-t hover:bg-gray-50">
                    <td className="py-3 px-2 font-medium text-gradient-blue">
                      {format(toZonedTime(new Date(o.start), bangladeshTz), 'MMM dd, yyyy')}
                    </td>
                    <td className="py-3 px-2 text-gradient-red">
                      {format(toZonedTime(new Date(o.start), bangladeshTz), 'HH:mm')}
                    </td>
                    <td className="py-3 px-2 text-gradient-green">
                      {o.end ? format(toZonedTime(new Date(o.end), bangladeshTz), 'HH:mm') : 'Ongoing'}
                    </td>
                    <td className="py-3 px-2">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-gradient-purple">
                        {o.durationMinutes !== undefined ? `${Math.floor(o.durationMinutes / 60)}h ${o.durationMinutes % 60}m` : '-'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* WhatsApp Preview */}
      <div className="rounded-xl border p-6 bg-gray-50">
        <h3 className="font-semibold mb-4 text-gradient-primary">WhatsApp Format Preview</h3>
        <div className="bg-white rounded-lg p-4 font-mono text-sm whitespace-pre-wrap border">
          {generateWhatsAppText()}
        </div>
        <p className="text-xs text-gray-600 mt-2">
          This is how the text will appear when copied to WhatsApp
        </p>
      </div>
    </div>
  );
}
