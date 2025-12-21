import { getValidAccessToken } from './tokens';
import {
  FitbitStepsResponse,
  FitbitHeartRateResponse,
  FitbitSleepResponse,
  FitbitProfileResponse,
  FitbitActivitySummaryResponse,
  FitbitSpO2Response,
  FitbitRespiratoryRateResponse,
  SimplifiedActivityData,
  SimplifiedHeartRateData,
  SimplifiedSleepData,
} from './types';

const FITBIT_API_BASE = 'https://api.fitbit.com/1/user/-';

// Generic Fitbit API request
async function fitbitRequest<T>(
  userId: string,
  endpoint: string
): Promise<T> {
  console.log('🔵 API: Making request to:', endpoint);
  
  const accessToken = await getValidAccessToken(userId);
  
  if (!accessToken) {
    console.error('🔴 API: No valid access token');
    throw new Error('No valid Fitbit access token available');
  }

  console.log('🟢 API: Got access token:', accessToken.substring(0, 20) + '...');

  const url = `${FITBIT_API_BASE}${endpoint}`;
  console.log('🔵 API: Full URL:', url);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log('🔵 API: Response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('🔴 API: Request failed:', {
      status: response.status,
      endpoint: endpoint,
      error: error,
    });
    throw new Error(`Fitbit API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  console.log('🟢 API: Response data for', endpoint, ':', JSON.stringify(data, null, 2));

  return data;
}

// Fetch user profile
export async function fetchProfile(userId: string): Promise<FitbitProfileResponse> {
  return await fitbitRequest<FitbitProfileResponse>(userId, '/profile.json');
}

// Fetch steps for a specific date
export async function fetchSteps(
  userId: string,
  date: string = 'today'
): Promise<FitbitStepsResponse> {
  return await fitbitRequest<FitbitStepsResponse>(
    userId,
    `/activities/steps/date/${date}/1d.json`
  );
}

// Fetch heart rate for a specific date
export async function fetchHeartRate(
  userId: string,
  date: string = 'today'
): Promise<FitbitHeartRateResponse> {
  return await fitbitRequest<FitbitHeartRateResponse>(
    userId,
    `/activities/heart/date/${date}/1d.json`
  );
}

// Fetch intraday heart rate (requires Personal app type)
// detailLevel: '1sec' or '1min'
export async function fetchIntradayHeartRate(
  userId: string,
  date: string = 'today',
  detailLevel: '1sec' | '1min' = '1min'
): Promise<any> {
  return await fitbitRequest<any>(
    userId,
    `/activities/heart/date/${date}/1d/${detailLevel}.json`
  );
}

// Fetch sleep data for a specific date
export async function fetchSleep(
  userId: string,
  date: string = 'today'
): Promise<FitbitSleepResponse> {
  return await fitbitRequest<FitbitSleepResponse>(
    userId,
    `/sleep/date/${date}.json`
  );
}

// Fetch daily activity summary
export async function fetchActivitySummary(
  userId: string,
  date: string = 'today'
): Promise<FitbitActivitySummaryResponse> {
  return await fitbitRequest<FitbitActivitySummaryResponse>(
    userId,
    `/activities/date/${date}.json`
  );
}

// Fetch SpO2 data
export async function fetchSpO2(
  userId: string,
  date: string = 'today'
): Promise<FitbitSpO2Response> {
  return await fitbitRequest<FitbitSpO2Response>(
    userId,
    `/spo2/date/${date}.json`
  );
}

// Fetch respiratory rate
export async function fetchRespiratoryRate(
  userId: string,
  date: string = 'today'
): Promise<FitbitRespiratoryRateResponse> {
  return await fitbitRequest<FitbitRespiratoryRateResponse>(
    userId,
    `/br/date/${date}.json`
  );
}

// Helper functions to get simplified data

export async function getSimplifiedActivityData(
  userId: string,
  date: string = 'today'
): Promise<SimplifiedActivityData> {
  const data = await fetchActivitySummary(userId, date);
  
  // Only return data if user actually had activity
  const hasActivity = data.summary.steps > 0 || 
                      data.summary.caloriesOut > 0 || 
                      data.summary.fairlyActiveMinutes > 0 ||
                      data.summary.veryActiveMinutes > 0;
  
  if (!hasActivity) {
    return {
      steps: 0,
      calories: 0,
      distance: 0,
      activeMinutes: 0,
      floors: 0,
    };
  }

  return {
    steps: data.summary.steps,
    calories: data.summary.caloriesOut,
    distance: data.summary.distances.find(d => d.activity === 'total')?.distance || 0,
    activeMinutes: data.summary.fairlyActiveMinutes + data.summary.veryActiveMinutes,
    floors: data.summary.floors,
  };
}

export async function getSimplifiedHeartRateData(
  userId: string,
  date: string = 'today'
): Promise<SimplifiedHeartRateData | null> {
  try {
    const data = await fetchHeartRate(userId, date);
    const heartData = data['activities-heart'][0];
    
    if (!heartData || !heartData.value) {
      return null;
    }

    // Only store zones that have activity (minutes > 0)
    const activeZones = heartData.value.heartRateZones
      .filter(zone => zone.minutes > 0)
      .map(zone => ({
        name: zone.name,
        min: zone.min,
        max: zone.max,
        minutes: zone.minutes,
        calories: zone.caloriesOut,
      }));

    return {
      restingHeartRate: heartData.value.restingHeartRate,
      zones: activeZones,
    };
  } catch (error) {
    console.error('Error fetching heart rate:', error);
    return null;
  }
}

export async function getSimplifiedSleepData(
  userId: string,
  date: string = 'today'
): Promise<SimplifiedSleepData | null> {
  try {
    const data = await fetchSleep(userId, date);
    const sleep = data.sleep[0];
    
    if (!sleep) {
      return null;
    }

    // Build clean sleep data object
    const sleepData: SimplifiedSleepData = {
      duration: sleep.duration,
      efficiency: sleep.efficiency,
      minutesAsleep: sleep.minutesAsleep,
      minutesAwake: sleep.minutesAwake,
      startTime: sleep.startTime,
      endTime: sleep.endTime,
    };

    // Only include stages if they exist and have data
    if (sleep.levels?.summary) {
      const stages = sleep.levels.summary;
      const hasStages = (stages.deep?.minutes || 0) > 0 || 
                       (stages.light?.minutes || 0) > 0 || 
                       (stages.rem?.minutes || 0) > 0;
      
      if (hasStages) {
        sleepData.stages = {
          deep: stages.deep?.minutes || 0,
          light: stages.light?.minutes || 0,
          rem: stages.rem?.minutes || 0,
          wake: stages.wake?.minutes || 0,
        };
      }
    }

    return sleepData;
  } catch (error) {
    console.error('Error fetching sleep:', error);
    return null;
  }
}

// Fetch all daily data at once
export async function fetchAllDailyData(userId: string, date: string = 'today') {
  console.log('🔵 API: Fetching all daily data for date:', date);
  
  const [activity, heartRate, sleep, profile] = await Promise.allSettled([
    getSimplifiedActivityData(userId, date),
    getSimplifiedHeartRateData(userId, date),
    getSimplifiedSleepData(userId, date),
    fetchProfile(userId),
  ]);

  console.log('🔵 API: Raw results from Fitbit:', {
    activity: {
      status: activity.status,
      data: activity.status === 'fulfilled' ? activity.value : activity.reason?.message,
    },
    heartRate: {
      status: heartRate.status,
      data: heartRate.status === 'fulfilled' ? heartRate.value : heartRate.reason?.message,
    },
    sleep: {
      status: sleep.status,
      data: sleep.status === 'fulfilled' ? sleep.value : sleep.reason?.message,
    },
    profile: {
      status: profile.status,
      data: profile.status === 'fulfilled' ? profile.value : profile.reason?.message,
    },
  });

  const result = {
    activity: activity.status === 'fulfilled' ? activity.value : null,
    heartRate: heartRate.status === 'fulfilled' ? heartRate.value : null,
    sleep: sleep.status === 'fulfilled' ? sleep.value : null,
    profile: profile.status === 'fulfilled' ? profile.value : null,
    date,
  };

  console.log('🟢 API: Final processed data:', JSON.stringify(result, null, 2));

  return result;
}
