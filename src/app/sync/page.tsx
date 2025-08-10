'use client';

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SyncPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [syncResult, setSyncResult] = useState<any>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/api/auth/signin');
    }
  }, [status, router]);

  const handleSync = async () => {
    setSyncStatus('syncing');
    setProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      clearInterval(progressInterval);
      setProgress(100);

      if (response.ok) {
        const result = await response.json();
        setSyncResult(result);
        setSyncStatus('success');
      } else {
        throw new Error('Sync failed');
      }
    } catch (error) {
      clearInterval(progressInterval);
      setSyncStatus('error');
      console.error('Sync error:', error);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-40 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Glassmorphism Container */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 p-8 text-center">
            {/* Header */}
            <div className="mb-8">
              <div className="w-20 h-20 bg-gradient-to-r from-blue-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-3xl">🔄</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Gmail Sync</h1>
              <p className="text-blue-100">
                Synchronize PDB notifications from your Gmail to track load shedding duration
              </p>
            </div>

            {/* Sync Status */}
            {syncStatus === 'idle' && (
              <div className="space-y-6">
                <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
                  <div className="text-left space-y-3">
                    <div className="flex items-center text-blue-200">
                      <span className="w-2 h-2 bg-blue-400 rounded-full mr-3"></span>
                      <span className="text-sm">Connect to Gmail API</span>
                    </div>
                    <div className="flex items-center text-blue-200">
                      <span className="w-2 h-2 bg-purple-400 rounded-full mr-3"></span>
                      <span className="text-sm">Read "PDB Notifications" label</span>
                    </div>
                    <div className="flex items-center text-blue-200">
                      <span className="w-2 h-2 bg-pink-400 rounded-full mr-3"></span>
                      <span className="text-sm">Parse outage events</span>
                    </div>
                    <div className="flex items-center text-blue-200">
                      <span className="w-2 h-2 bg-green-400 rounded-full mr-3"></span>
                      <span className="text-sm">Calculate durations</span>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleSync}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  Start Sync
                </button>
              </div>
            )}

            {syncStatus === 'syncing' && (
              <div className="space-y-6">
                <div className="relative">
                  <div className="w-24 h-24 mx-auto mb-4">
                    <div className="relative w-full h-full">
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-spin opacity-75"></div>
                      <div className="absolute inset-2 bg-gradient-to-br from-indigo-900 to-purple-900 rounded-full flex items-center justify-center">
                        <span className="text-2xl">📧</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
                    <h3 className="text-white font-semibold mb-4">Synchronizing...</h3>
                    <div className="w-full bg-white/20 rounded-full h-3 mb-4">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <p className="text-blue-200 text-sm">{Math.round(progress)}% complete</p>
                  </div>
                </div>
              </div>
            )}

            {syncStatus === 'success' && (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <span className="text-3xl">✅</span>
                </div>
                
                <div className="bg-white/10 rounded-2xl p-6 border border-white/10">
                  <h3 className="text-white font-semibold mb-4">Sync Complete!</h3>
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold text-white">{syncResult?.inserted || 0}</p>
                      <p className="text-blue-200 text-sm">Messages Processed</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-white">{syncResult?.outages || 0}</p>
                      <p className="text-blue-200 text-sm">Outages Calculated</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
                  >
                    Dashboard
                  </button>
                  <button
                    onClick={() => {
                      setSyncStatus('idle');
                      setSyncResult(null);
                      setProgress(0);
                    }}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 border border-white/20"
                  >
                    Sync Again
                  </button>
                </div>
              </div>
            )}

            {syncStatus === 'error' && (
              <div className="space-y-6">
                <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">❌</span>
                </div>
                
                <div className="bg-red-500/20 rounded-2xl p-6 border border-red-500/30">
                  <h3 className="text-white font-semibold mb-2">Sync Failed</h3>
                  <p className="text-red-200 text-sm">
                    Unable to synchronize with Gmail. Please check your connection and try again.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleSync}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200"
                  >
                    Retry Sync
                  </button>
                  <button
                    onClick={() => router.push('/')}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 border border-white/20"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-blue-200 text-xs">
                Logged in as {session.user?.email}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
