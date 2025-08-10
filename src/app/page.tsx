'use client';

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Fetch quick stats for dashboard
  useEffect(() => {
    if (session) {
      const fetchStats = async () => {
        try {
          const response = await fetch('/api/stats?scope=daily');
          if (response.ok) {
            const data = await response.json();
            setStats(data);
          }
        } catch (error) {
          console.error('Failed to fetch stats:', error);
        }
      };
      fetchStats();
    }
  }, [session]);

  if (!session) {
    return (
      <div className="min-h-[80vh] bg-white">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8 text-center">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⚡</span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">Load Shedding Tracker</h1>
              <p className="text-gray-600 mb-8">
                Track PDB load shedding duration from Gmail notifications with beautiful reports and analytics.
              </p>
              <a 
                className="inline-flex items-center justify-center w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg" 
                href="/api/auth/signin"
              >
                <span className="mr-2">🔑</span>
                Sign in with Google
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] bg-white">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-8 rounded-2xl mb-8 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {session.user?.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-blue-100">Monitor load shedding patterns and duration with real-time insights</p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 rounded-xl p-4 backdrop-blur-sm">
              <p className="text-sm text-blue-100">Today's Total</p>
              <p className="text-2xl font-bold">{stats?.totalHours || 0}h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center">
              <span className="text-xl">🔄</span>
            </div>
            <form action="/sync" method="get">
              <button 
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
                type="submit"
              >
                Sync Now
              </button>
            </form>
          </div>
          <h3 className="font-semibold text-gray-900 mb-1">Gmail Sync</h3>
          <p className="text-sm text-gray-600">Update load shedding data</p>
        </div>

        <Link href="/daily" className="block">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 h-full">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mb-4">
              <span className="text-xl">📅</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Daily Report</h3>
            <p className="text-sm text-gray-600">Today's outages</p>
          </div>
        </Link>

        <Link href="/weekly" className="block">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 h-full">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mb-4">
              <span className="text-xl">📊</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Weekly Report ⭐</h3>
            <p className="text-sm text-gray-600">7-day breakdown</p>
          </div>
        </Link>

        <Link href="/monthly" className="block">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 h-full">
            <div className="w-12 h-12 bg-gradient-to-r from-orange-400 to-orange-600 rounded-xl flex items-center justify-center mb-4">
              <span className="text-xl">📈</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Monthly Report</h3>
            <p className="text-sm text-gray-600">Current month</p>
          </div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Summary */}
        <div className="lg:col-span-2 bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Today's Load Shedding</h3>
          {stats?.outages?.length > 0 ? (
            <div className="space-y-3">
              {stats.outages.slice(0, 3).map((outage: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100">
                  <div>
                    <p className="font-medium text-gray-900">
                      {new Date(outage.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {outage.end && ` - ${new Date(outage.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                    <p className="text-sm text-gray-600">
                      {outage.durationMinutes ? `${Math.floor(outage.durationMinutes / 60)}h ${outage.durationMinutes % 60}m` : 'Ongoing'}
                    </p>
                  </div>
                  <div className="text-2xl">⚡</div>
                </div>
              ))}
              {stats.outages.length > 3 && (
                <Link href="/daily" className="block text-center text-blue-600 hover:text-blue-700 font-medium">
                  View all {stats.outages.length} outages →
                </Link>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">✅</span>
              </div>
              <p className="text-gray-600">No load shedding today!</p>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Total Duration</span>
              <span className="text-2xl">⏱️</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.totalHours || 0}h</p>
            <p className="text-sm text-gray-500">{stats?.totalMinutes || 0} minutes</p>
          </div>

          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Outages Today</span>
              <span className="text-2xl">📊</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats?.outages?.length || 0}</p>
            <p className="text-sm text-gray-500">incidents</p>
          </div>
        </div>
      </div>

      {/* How it Works */}
      <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-lg font-bold text-gray-900 mb-4">💡 How it works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">📧</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Email Reading</h4>
            <p className="text-sm text-gray-600">We monitor your "PDB Notifications" Gmail label</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-400 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">⚡</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Smart Parsing</h4>
            <p className="text-sm text-gray-600">Parse "PDB Down" and "PDB Up" subjects automatically</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-gradient-to-r from-green-400 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-3">
              <span className="text-xl">📈</span>
            </div>
            <h4 className="font-semibold text-gray-900 mb-1">Duration Tracking</h4>
            <p className="text-sm text-gray-600">Calculate precise load shedding duration and trends</p>
          </div>
        </div>
      </div>
    </div>
  );
}
