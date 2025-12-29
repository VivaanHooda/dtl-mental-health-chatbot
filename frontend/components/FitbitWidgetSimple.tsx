'use client';

import React, { useState, useEffect } from 'react';
import { Activity, Heart, Moon, RefreshCw, X } from 'lucide-react';

interface FitbitStatus {
    connected: boolean;
}

interface FitbitData {
    activity: { steps: number; calories: number } | null;
    heartRate: {
        restingHeartRate?: number;
        zones?: Array<{ name: string; minutes: number }>;
    } | null;
    sleep: { minutesAsleep: number } | null;
}

export default function FitbitWidgetSimple() {
    const [status, setStatus] = useState<FitbitStatus | null>(null);
    const [data, setData] = useState<FitbitData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const response = await fetch('/api/fitbit/status');
            const statusData = await response.json();
            setStatus(statusData);

            if (statusData.connected) {
                const dataResponse = await fetch('/api/fitbit/data?date=today');
                const fitbitData = await dataResponse.json();
                setData(fitbitData.data);
            }
        } catch (err) {
            console.error('Fitbit fetch error');
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Disconnect Fitbit?')) return;

        await fetch('/api/fitbit/disconnect', { method: 'POST' });
        setStatus({ connected: false });
        setData(null);
    };

    if (loading) {
        return (
            <div className="glass rounded-3xl p-6">
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    if (!status?.connected) {
        return (
            <div className="glass rounded-3xl p-6">
                <h3 className="font-semibold mb-4">Connect Fitbit</h3>
                <button
                    onClick={() => (window.location.href = '/api/fitbit/authorize')}
                    className="w-full bg-primary text-white py-2 rounded-2xl"
                >
                    Connect
                </button>
            </div>
        );
    }

    return (
        <div className="glass rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Fitbit</h3>
                <div className="flex gap-2">
                    <button onClick={checkStatus} className="p-2 hover:bg-primary/10 rounded-xl">
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    <button onClick={handleDisconnect} className="p-2 hover:bg-error/10 rounded-xl">
                        <X className="w-4 h-4 text-error" />
                    </button>
                </div>
            </div>

            <div className="space-y-3">
                {/* Steps */}
                {data?.activity && (
                    <div className="flex items-center gap-3">
                        <Activity className="w-4 h-4 text-primary" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Steps</p>
                            <p className="font-semibold">{data.activity.steps.toLocaleString()}</p>
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Calories</p>
                            <p className="font-semibold">{data.activity.calories.toLocaleString()}</p>
                        </div>
                    </div>
                )}

                {/* Heart Rate */}
                {data?.heartRate && (
                    <div className="flex items-center gap-3">
                        <Heart className="w-4 h-4 text-error" />
                        <div className="flex-1">
                            {data.heartRate.restingHeartRate ? (
                                <>
                                    <p className="text-xs text-muted-foreground">Resting HR</p>
                                    <p className="font-semibold">{data.heartRate.restingHeartRate} bpm</p>
                                </>
                            ) : data.heartRate.zones && data.heartRate.zones.length > 0 ? (
                                <div>
                                    <p className="text-xs text-muted-foreground">Heart Rate Zones</p>
                                    {data.heartRate.zones.map((zone) => (
                                        <div key={zone.name} className="flex justify-between text-sm">
                                            <span>{zone.name}</span>
                                            <span className="font-medium">{zone.minutes} min</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">No HR data</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Sleep */}
                {data?.sleep && data.sleep.minutesAsleep > 0 && (
                    <div className="flex items-center gap-3">
                        <Moon className="w-4 h-4 text-secondary" />
                        <div className="flex-1">
                            <p className="text-xs text-muted-foreground">Sleep</p>
                            <p className="font-semibold">
                                {Math.floor(data.sleep.minutesAsleep / 60)}h {data.sleep.minutesAsleep % 60}m
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
