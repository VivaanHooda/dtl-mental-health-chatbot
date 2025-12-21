// Fitbit API Response Types

export interface FitbitStepsResponse {
  'activities-steps': Array<{
    dateTime: string;
    value: string;
  }>;
}

export interface FitbitHeartRateResponse {
  'activities-heart': Array<{
    dateTime: string;
    value: {
      customHeartRateZones: any[];
      heartRateZones: Array<{
        caloriesOut: number;
        max: number;
        min: number;
        minutes: number;
        name: string;
      }>;
      restingHeartRate: number;
    };
  }>;
}

export interface FitbitIntradayHeartRateResponse extends FitbitHeartRateResponse {
  'activities-heart-intraday': {
    dataset: Array<{
      time: string; // "HH:mm:ss" format
      value: number; // heart rate in bpm
    }>;
    datasetInterval: number; // 1 for 1-second or 1-minute intervals
    datasetType: 'second' | 'minute';
  };
}

export interface FitbitSleepResponse {
  sleep: Array<{
    dateOfSleep: string;
    duration: number;
    efficiency: number;
    endTime: string;
    startTime: string;
    minutesAsleep: number;
    minutesAwake: number;
    minutesToFallAsleep: number;
    timeInBed: number;
    type: string;
    levels?: {
      summary: {
        deep?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
        light?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
        rem?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
        wake?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
      };
    };
  }>;
  summary: {
    totalMinutesAsleep: number;
    totalSleepRecords: number;
    totalTimeInBed: number;
  };
}

export interface FitbitProfileResponse {
  user: {
    age: number;
    ambassador: boolean;
    avatar: string;
    avatarUrl: string;
    dateOfBirth: string;
    displayName: string;
    firstName: string;
    fullName: string;
    gender: string;
    height: number;
    heightUnit: string;
    lastName: string;
    memberSince: string;
    weight: number;
    weightUnit: string;
  };
}

export interface FitbitActivitySummaryResponse {
  summary: {
    activeScore: number;
    activityCalories: number;
    caloriesBMR: number;
    caloriesOut: number;
    distances: Array<{
      activity: string;
      distance: number;
    }>;
    elevation: number;
    fairlyActiveMinutes: number;
    floors: number;
    lightlyActiveMinutes: number;
    marginalCalories: number;
    sedentaryMinutes: number;
    steps: number;
    veryActiveMinutes: number;
  };
}

export interface FitbitSpO2Response {
  dateTime: string;
  value: {
    avg: number;
    min: number;
    max: number;
  };
}

export interface FitbitRespiratoryRateResponse {
  br: Array<{
    dateTime: string;
    value: {
      breathingRate: number;
    };
  }>;
}

export interface FitbitTemperatureResponse {
  tempCore: Array<{
    dateTime: string;
    value: number;
  }>;
}

// Simplified types for storing in our database
export interface SimplifiedActivityData {
  steps: number;
  calories: number;
  distance: number;
  activeMinutes: number;
  floors: number;
}

export interface SimplifiedHeartRateData {
  restingHeartRate: number;
  zones: Array<{
    name: string;
    min: number;
    max: number;
    minutes: number;
    calories: number;
  }>;
}

export interface SimplifiedSleepData {
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
}
