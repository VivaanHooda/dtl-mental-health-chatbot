'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Heart, Moon, User, Check, X, Loader2, RefreshCw } from 'lucide-react';

interface FitbitStatus {
  connected: boolean;
  fitbitUserId?: string;
  scope?: string;
  expiresAt?: string;
}

interface FitbitData {
  activity: {
    steps: number;
    calories: number;
    distance: number;
    activeMinutes: number;
    floors: number;
  } | null;
  heartRate: {
    restingHeartRate: number;
    zones: Array<{
      name: string;
      min: number;
      max: number;
      minutes: number;
      calories: number;
    }>;
  } | null;
  sleep: {
    duration: number;
    efficiency: number;
    minutesAsleep: number;
    minutesAwake: number;
    startTime: string;
    endTime: string;
    stages?: {
      deep: number;
      light: number;
      rem: number;
      wake: number;
    };
  } | null;
  date: string;
}

export default function FitbitWidget() {
  const [status, setStatus] = useState<FitbitStatus | null>(null);
  const [data, setData] = useState<FitbitData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  // Check connection status on mount
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/fitbit/status');
      const data = await response.json();
      
      if (response.ok) {
        setStatus(data);
        if (data.connected) {
          fetchData();
        }
      } else {
        setError(data.error);
      }
    } catch (err: any) {
      setError('Failed to check Fitbit status');
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    try {
      setSyncing(true);
      const response = await fetch('/api/fitbit/data');
      const result = await response.json();
      
      if (response.ok) {
        setData(result.data);
        setError('');
      } else {
        setError(result.error);
      }
    } catch (err: any) {
      setError('Failed to fetch Fitbit data');
    } finally {
      setSyncing(false);
    }
  };

  const handleConnect = () => {
    window.location.href = '/api/fitbit/authorize';
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Fitbit? All stored data will be deleted.')) {
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/fitbit/disconnect', {
        method: 'POST',
      });
      
      if (response.ok) {
        setStatus({ connected: false });
        setData(null);
      } else {
        const result = await response.json();
        setError(result.error);
      }
    } catch (err: any) {
      setError('Failed to disconnect Fitbit');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-linear-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Connect Fitbit
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track your health metrics
            </p>
          </div>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
          Connect your Fitbit to help us provide better mental health insights based on your:
        </p>

        <ul className="space-y-2 mb-6">
          <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-green-500" />
            Sleep patterns & quality
          </li>
          <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-green-500" />
            Heart rate & stress levels
          </li>
          <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <Check className="w-4 h-4 text-green-500" />
            Activity & exercise data
          </li>
        </ul>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        <button
          onClick={handleConnect}
          className="w-full bg-linear-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-lg font-medium hover:from-cyan-600 hover:to-blue-600 transition-all"
        >
          Connect Fitbit
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-slate-100">
              Fitbit Connected
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Last synced: {syncing ? 'Syncing...' : 'Just now'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={fetchData}
            disabled={syncing}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 dark:text-slate-400 ${syncing ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleDisconnect}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Disconnect"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {/* Data Display */}
      {data && (
        <div className="space-y-4">
          {/* Activity */}
          {data.activity && (
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-cyan-500" />
                <h4 className="font-medium text-slate-800 dark:text-slate-100">Activity</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Steps</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {data.activity.steps.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Calories</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {data.activity.calories.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Distance</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {data.activity.distance.toFixed(2)} km
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Active Min</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {data.activity.activeMinutes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Heart Rate */}
          {data.heartRate && (
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-red-500" />
                <h4 className="font-medium text-slate-800 dark:text-slate-100">Heart Rate</h4>
              </div>
              <div className="text-sm">
                <p className="text-slate-500 dark:text-slate-400">Resting Heart Rate</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {data.heartRate.restingHeartRate} <span className="text-sm font-normal">bpm</span>
                </p>
              </div>
            </div>
          )}

          {/* Sleep */}
          {data.sleep && (
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 text-purple-500" />
                <h4 className="font-medium text-slate-800 dark:text-slate-100">Sleep</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Duration</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {Math.floor(data.sleep.minutesAsleep / 60)}h {data.sleep.minutesAsleep % 60}m
                  </p>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Efficiency</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {data.sleep.efficiency}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}
    </div>
  );
}
