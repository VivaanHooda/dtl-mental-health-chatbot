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

  const fetchData = async (date: string = 'today') => {
    try {
      setSyncing(true);
      const response = await fetch(`/api/fitbit/data?date=${date}`);
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

  const syncLast7Days = async () => {
    if (!confirm('This will fetch the last 7 days of data from Fitbit. Continue?')) {
      return;
    }

    try {
      setSyncing(true);
      const today = new Date();
      const promises = [];

      // Fetch last 7 days
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        promises.push(fetch(`/api/fitbit/data?date=${dateStr}`));
      }

      await Promise.all(promises);

      // Refresh today's data to display
      await fetchData('today');

      alert('Successfully synced last 7 days of Fitbit data!');
    } catch (err: any) {
      setError('Failed to sync data');
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
      <div className="glass rounded-3xl p-6 hover:shadow-lg transition-all duration-300">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!status?.connected) {
    return (
      <div className="glass rounded-3xl p-6 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-linear-to-br from-primary to-info rounded-2xl flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Connect Fitbit
            </h3>
            <p className="text-sm text-muted-foreground">
              Track your health metrics
            </p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Connect your Fitbit to help us provide better mental health insights based on your:
        </p>

        <ul className="space-y-2 mb-6">
          <li className="flex items-center gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-success" />
            Sleep patterns & quality
          </li>
          <li className="flex items-center gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-success" />
            Heart rate & stress levels
          </li>
          <li className="flex items-center gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-success" />
            Activity & exercise data
          </li>
        </ul>

        {error && (
          <div className="mb-4 p-3 glass border-error/30 rounded-2xl">
            <p className="text-sm text-error">{error}</p>
          </div>
        )}

        <button
          onClick={handleConnect}
          className="w-full bg-linear-to-r from-primary to-info text-white py-3 rounded-2xl font-medium hover:shadow-[0_8px_30px_rgb(99,102,241,0.3)] transition-all duration-300 transform hover:scale-[1.02]"
        >
          Connect Fitbit
        </button>
      </div>
    );
  }

  return (
    <div className="glass rounded-3xl p-6 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-br from-primary to-info rounded-2xl flex items-center justify-center shadow-lg">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              Fitbit Connected
            </h3>
            <p className="text-xs text-muted-foreground">
              Last synced: {syncing ? 'Syncing...' : 'Just now'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => fetchData('today')}
            disabled={syncing}
            className="p-2 hover:bg-primary/10 rounded-2xl transition-all duration-200 group"
            title="Refresh today's data"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
          </button>
          <button
            onClick={handleDisconnect}
            className="p-2 hover:bg-error/10 rounded-2xl transition-all duration-200"
            title="Disconnect"
          >
            <X className="w-4 h-4 text-error" />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-4">
        <button
          onClick={syncLast7Days}
          disabled={syncing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-2xl transition-all duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          <span className="text-sm font-medium">
            {syncing ? 'Syncing...' : 'Sync Last 7 Days'}
          </span>
        </button>
      </div>

      {/* Data Display */}
      {data && (
        <div className="space-y-4">
          {/* Activity */}
          {data.activity && (
            <div className="p-4 glass rounded-2xl hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <Activity className="w-4 h-4 text-primary" />
                <h4 className="font-medium text-foreground">Activity</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Steps</p>
                  <p className="font-semibold text-foreground">
                    {data.activity.steps.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Calories</p>
                  <p className="font-semibold text-foreground">
                    {data.activity.calories.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Distance</p>
                  <p className="font-semibold text-foreground">
                    {data.activity.distance.toFixed(2)} km
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Active Min</p>
                  <p className="font-semibold text-foreground">
                    {data.activity.activeMinutes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Heart Rate */}
          {data.heartRate && (
            <div className="p-4 glass rounded-2xl hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <Heart className="w-4 h-4 text-error" />
                <h4 className="font-medium text-foreground">Heart Rate</h4>
              </div>
              {data.heartRate.restingHeartRate ? (
                <div className="text-sm">
                  <p className="text-muted-foreground">Resting Heart Rate</p>
                  <p className="text-2xl font-bold text-foreground">
                    {data.heartRate.restingHeartRate} <span className="text-sm font-normal">bpm</span>
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Heart Rate Zones Today</p>
                  {data.heartRate.zones?.map((zone: any) => (
                    <div key={zone.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{zone.name}</span>
                      <span className="font-medium text-foreground">{zone.minutes} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sleep */}
          {data.sleep && (
            <div className="p-4 glass rounded-2xl hover:shadow-lg transition-all duration-200">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="w-4 h-4 text-secondary" />
                <h4 className="font-medium text-foreground">Sleep</h4>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Duration</p>
                  <p className="font-semibold text-foreground">
                    {Math.floor(data.sleep.minutesAsleep / 60)}h {data.sleep.minutesAsleep % 60}m
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Efficiency</p>
                  <p className="font-semibold text-foreground">
                    {data.sleep.efficiency}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 glass border-error/30 rounded-2xl">
          <p className="text-sm text-error">{error}</p>
        </div>
      )}
    </div>
  );
}
