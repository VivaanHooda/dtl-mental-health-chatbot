// Fitbit OAuth Configuration
export const FITBIT_CONFIG = {
  clientId: process.env.NEXT_PUBLIC_FITBIT_CLIENT_ID!,
  clientSecret: process.env.FITBIT_CLIENT_SECRET!,
  redirectUri: process.env.NEXT_PUBLIC_FITBIT_REDIRECT_URI!,
  authorizationUrl: 'https://www.fitbit.com/oauth2/authorize',
  tokenUrl: 'https://api.fitbit.com/oauth2/token',
  scopes: [
    'activity',
    'heartrate',
    'sleep',
    'profile',
    'nutrition',
    'weight',
    'oxygen_saturation',
    'respiratory_rate',
    'temperature'
  ],
  tokenExpiry: 28800 // 8 hours in seconds
};

// Get authorization URL with all required parameters
export function getFitbitAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: FITBIT_CONFIG.clientId,
    redirect_uri: FITBIT_CONFIG.redirectUri,
    scope: FITBIT_CONFIG.scopes.join(' '),
    expires_in: '31536000', // 1 year
  });

  if (state) {
    params.append('state', state);
  }

  return `${FITBIT_CONFIG.authorizationUrl}?${params.toString()}`;
}

// Create Basic Auth header for token requests
export function getBasicAuthHeader(): string {
  const credentials = `${FITBIT_CONFIG.clientId}:${FITBIT_CONFIG.clientSecret}`;
  const encoded = Buffer.from(credentials).toString('base64');
  return `Basic ${encoded}`;
}
