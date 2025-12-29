import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
    fetchIntradayHeartRate,
    fetchIntradayActivity,
    fetchHRV,
    fetchBreathingRate,
    fetchSpO2
} from '@/lib/fitbit/intraday-api';

/**
 * GET /api/fitbit/intraday/wellness
 * 
 * Fetches recent wellness metrics for mental health correlation:
 * - Heart Rate (last 30 min, 1min intervals)
 * - HRV (Heart Rate Variability - stress indicator)
 * - Activity (steps, calories with activity level)
 * - Breathing Rate (anxiety indicator)
 * - SpO2 (blood oxygen - fatigue indicator)
 */
export async function GET(request: NextRequest) {
    console.log('🔵 WELLNESS: Starting intraday wellness fetch');

    try {
        const supabase = await createClient();

        // Check authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError || !user) {
            console.error('🔴 WELLNESS: Auth failed:', authError?.message);
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('🟢 WELLNESS: User authenticated:', user.id.substring(0, 8) + '...');

        // Get time range (last 30 minutes)
        const now = new Date();
        const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);

        const endTime = now.toTimeString().substring(0, 5); // "HH:MM"
        const startTime = thirtyMinAgo.toTimeString().substring(0, 5);

        console.log('🔵 WELLNESS: Time range:', startTime, '-', endTime);

        // Fetch all metrics in parallel
        console.log('🔵 WELLNESS: Fetching metrics in parallel...');
        const [heartRateResult, hrvResult, activityResult, breathingResult, spo2Result] =
            await Promise.allSettled([
                fetchIntradayHeartRate(user.id, 'today', '1min', startTime, endTime),
                fetchHRV(user.id, 'today'),
                fetchIntradayActivity(user.id, 'calories', 'today', '1min', startTime, endTime),
                fetchBreathingRate(user.id, 'today'),
                fetchSpO2(user.id, 'today'),
            ]);

        // Process Heart Rate
        let heartRate = null;
        if (heartRateResult.status === 'fulfilled') {
            const hrData = heartRateResult.value;
            const dataset = hrData['activities-heart-intraday']?.dataset || [];

            if (dataset.length > 0) {
                const values = dataset.map((d: any) => d.value);
                const current = values[values.length - 1] || 0;
                const avg = Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length);
                const max = Math.max(...values);
                const min = Math.min(...values);

                heartRate = { current, avg, max, min, dataset: values };
                console.log('🟢 WELLNESS: Heart rate -', current, 'bpm (avg:', avg, ')');
            }
        } else {
            console.warn('⚠️ WELLNESS: Heart rate fetch failed:', heartRateResult.reason?.message);
        }

        // Process HRV
        let hrv = null;
        if (hrvResult.status === 'fulfilled') {
            const hrvData = hrvResult.value;
            const dailyRmssd = hrvData.hrv?.[0]?.value?.dailyRmssd;
            const deepRmssd = hrvData.hrv?.[0]?.value?.deepRmssd;

            if (dailyRmssd) {
                hrv = {
                    current: dailyRmssd,
                    deep: deepRmssd,
                    status: dailyRmssd > 40 ? 'good' : dailyRmssd > 20 ? 'normal' : 'low'
                };
                console.log('🟢 WELLNESS: HRV -', dailyRmssd, 'ms (', hrv.status, ')');
            }
        } else {
            console.warn('⚠️ WELLNESS: HRV fetch failed:', hrvResult.reason?.message);
        }

        // Process Activity (calories with activity level)
        let activity = null;
        if (activityResult.status === 'fulfilled') {
            const actData = activityResult.value;
            const dataset = actData['activities-calories-intraday']?.dataset || [];

            if (dataset.length > 0) {
                const totalCalories = dataset.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
                const activityLevels = dataset.map((d: any) => d.level || 0);
                const avgLevel = activityLevels.reduce((a: number, b: number) => a + b, 0) / activityLevels.length;

                const activityStatus = avgLevel > 2 ? 'very_active' :
                    avgLevel > 1 ? 'active' :
                        avgLevel > 0.5 ? 'light' : 'sedentary';

                activity = {
                    calories: Math.round(totalCalories),
                    activityLevel: Math.round(avgLevel * 10) / 10,
                    status: activityStatus,
                    dataset: dataset.map((d: any) => ({ time: d.time, value: d.value, level: d.level }))
                };
                console.log('🟢 WELLNESS: Activity -', totalCalories, 'cal,', activityStatus);
            }
        } else {
            console.warn('⚠️ WELLNESS: Activity fetch failed:', activityResult.reason?.message);
        }

        // Process Breathing Rate
        let breathing = null;
        if (breathingResult.status === 'fulfilled') {
            const brData = breathingResult.value;
            const breathingRate = brData.br?.[0]?.value?.breathingRate;

            if (breathingRate) {
                breathing = {
                    current: breathingRate,
                    status: breathingRate > 18 ? 'elevated' :
                        breathingRate > 12 ? 'normal' : 'low'
                };
                console.log('🟢 WELLNESS: Breathing -', breathingRate, 'bpm (', breathing.status, ')');
            }
        } else {
            console.warn('⚠️ WELLNESS: Breathing fetch failed:', breathingResult.reason?.message);
        }

        // Process SpO2
        let spo2 = null;
        if (spo2Result.status === 'fulfilled') {
            const spo2Data = spo2Result.value;
            const spo2Value = spo2Data.spo2?.[0]?.value?.avg;

            if (spo2Value) {
                spo2 = {
                    current: spo2Value,
                    status: spo2Value > 95 ? 'healthy' :
                        spo2Value > 90 ? 'fair' : 'low'
                };
                console.log('🟢 WELLNESS: SpO2 -', spo2Value, '% (', spo2.status, ')');
            }
        } else {
            console.warn('⚠️ WELLNESS: SpO2 fetch failed:', spo2Result.reason?.message);
        }

        // Calculate mental health indicators
        const mentalHealthIndicators = calculateMentalHealthIndicators({
            heartRate,
            hrv,
            activity,
            breathing,
            spo2
        });

        console.log('🧠 WELLNESS: Mental health indicators calculated:', mentalHealthIndicators);

        const response = {
            timestamp: now.toISOString(),
            timeRange: `${startTime} - ${endTime}`,
            metrics: {
                heartRate,
                hrv,
                activity,
                breathing,
                spo2
            },
            mentalHealthIndicators,
        };

        console.log('🟢 WELLNESS: Wellness data compiled successfully');

        return NextResponse.json(response);

    } catch (error: any) {
        console.error('🔴 WELLNESS: Error fetching wellness data:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to fetch wellness data' },
            { status: 500 }
        );
    }
}

/**
 * Calculate mental health indicators from wellness metrics
 */
function calculateMentalHealthIndicators(metrics: {
    heartRate: any;
    hrv: any;
    activity: any;
    breathing: any;
    spo2: any;
}) {
    const indicators = {
        stressLevel: 'unknown' as 'low' | 'moderate' | 'high' | 'unknown',
        anxietyRisk: 'unknown' as 'low' | 'moderate' | 'high' | 'unknown',
        fatigueLevel: 'unknown' as 'low' | 'moderate' | 'high' | 'unknown',
        activityStatus: 'unknown' as 'sedentary' | 'light' | 'active' | 'very_active' | 'unknown',
        recommendations: [] as string[],
    };

    // Stress Level (based on HRV + Heart Rate)
    if (metrics.hrv && metrics.heartRate) {
        const hrvLow = metrics.hrv.current < 20;
        const hrElevated = metrics.heartRate.current > 90;

        if (hrvLow && hrElevated) {
            indicators.stressLevel = 'high';
            indicators.recommendations.push('Your stress levels seem elevated. Consider a breathing exercise.');
        } else if (hrvLow || hrElevated) {
            indicators.stressLevel = 'moderate';
            indicators.recommendations.push('Your body shows some signs of stress. Take a short break.');
        } else {
            indicators.stressLevel = 'low';
            indicators.recommendations.push('Your stress levels are low - great job!');
        }
    }

    // Anxiety Risk (based on Heart Rate + Breathing)
    if (metrics.heartRate && metrics.breathing) {
        const hrHigh = metrics.heartRate.current > 100;
        const breathingElevated = metrics.breathing.current > 18;

        if (hrHigh && breathingElevated) {
            indicators.anxietyRisk = 'high';
            indicators.recommendations.push('Elevated heart rate and breathing detected. Try the 4-7-8 breathing technique.');
        } else if (hrHigh || breathingElevated) {
            indicators.anxietyRisk = 'moderate';
        } else {
            indicators.anxietyRisk = 'low';
        }
    }

    // Fatigue Level (based on SpO2 + Activity)
    if (metrics.spo2 && metrics.activity) {
        const spo2Low = metrics.spo2.current < 95;
        const activityLow = metrics.activity.status === 'sedentary';

        if (spo2Low && activityLow) {
            indicators.fatigueLevel = 'high';
            indicators.recommendations.push('Low oxygen and activity levels. Consider a gentle walk.');
        } else if (spo2Low || activityLow) {
            indicators.fatigueLevel = 'moderate';
        } else {
            indicators.fatigueLevel = 'low';
        }
    }

    // Activity Status
    if (metrics.activity) {
        indicators.activityStatus = metrics.activity.status;

        if (metrics.activity.status === 'sedentary') {
            indicators.recommendations.push('You\'ve been sedentary. A 5-minute walk can boost your mood!');
        }
    }

    return indicators;
}
