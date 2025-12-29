/**
 * Fitbit Intraday API
 * 
 * Functions for fetching high-resolution intraday data
 * Requires Personal app type (automatic access)
 */

import { getValidAccessToken } from './tokens';

const FITBIT_API_BASE = 'https://api.fitbit.com/1/user/-';

/**
 * Generic Fitbit intraday request
 */
async function fitbitIntradayRequest<T>(
    userId: string,
    endpoint: string
): Promise<T> {
    const accessToken = await getValidAccessToken(userId);

    if (!accessToken) {
        throw new Error('No valid Fitbit access token available');
    }

    const url = `${FITBIT_API_BASE}${endpoint}`;

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Fitbit API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data;
}

/**
 * Fetch intraday heart rate
 * @param detailLevel - '1sec' or '1min'
 */
export async function fetchIntradayHeartRate(
    userId: string,
    date?: string,
    detailLevel: '1sec' | '1min' = '1min',
    startTime?: string,
    endTime?: string
): Promise<any> {
    // Always use YYYY-MM-DD format (Fitbit doesn't accept 'today')
    const actualDate = date || new Date().toISOString().split('T')[0];
    let endpoint = `/activities/heart/date/${actualDate}/1d/${detailLevel}.json`;

    if (startTime && endTime) {
        endpoint = `/activities/heart/date/${date}/1d/${detailLevel}/time/${startTime}/${endTime}.json`;
    }

    return await fitbitIntradayRequest<any>(userId, endpoint);
}

/**
 * Fetch intraday activity (steps, calories, distance, floors, elevation)
 * @param resource - 'calories' | 'distance' | 'elevation' | 'floors' | 'steps'
 * @param detailLevel - '1min' | '5min' | '15min'
 */
export async function fetchIntradayActivity(
    userId: string,
    resource: 'calories' | 'distance' | 'elevation' | 'floors' | 'steps',
    date?: string,
    detailLevel: '1min' | '5min' | '15min' = '1min',
    startTime?: string,
    endTime?: string
): Promise<any> {
    // Always use YYYY-MM-DD format (Fitbit doesn't accept 'today')
    const actualDate = date || new Date().toISOString().split('T')[0];
    let endpoint = `/activities/${resource}/date/${actualDate}/1d/${detailLevel}.json`;

    if (startTime && endTime) {
        endpoint = `/activities/${resource}/date/${date}/1d/${detailLevel}/time/${startTime}/${endTime}.json`;
    }

    return await fitbitIntradayRequest<any>(userId, endpoint);
}

/**
 * Fetch HRV (Heart Rate Variability)
 */
export async function fetchHRV(
    userId: string,
    date: string = 'today'
): Promise<any> {
    return await fitbitIntradayRequest<any>(
        userId,
        `/hrv/date/${date}.json`
    );
}

/**
 * Fetch breathing rate
 */
export async function fetchBreathingRate(
    userId: string,
    date: string = 'today'
): Promise<any> {
    return await fitbitIntradayRequest<any>(
        userId,
        `/br/date/${date}.json`
    );
}

/**
 * Fetch SpO2 (blood oxygen saturation)
 */
export async function fetchSpO2(
    userId: string,
    date: string = 'today'
): Promise<any> {
    return await fitbitIntradayRequest<any>(
        userId,
        `/spo2/date/${date}.json`
    );
}

/**
 * Fetch intraday steps with time range
 */
export async function fetchIntradaySteps(
    userId: string,
    date: string = 'today',
    detailLevel: '1min' | '5min' | '15min' = '1min',
    startTime?: string,
    endTime?: string
): Promise<any> {
    return fetchIntradayActivity(userId, 'steps', date, detailLevel, startTime, endTime);
}
