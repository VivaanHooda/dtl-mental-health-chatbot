import { createClient } from '@/lib/supabase/server';
import { FITBIT_CONFIG, getBasicAuthHeader } from './config';

export interface FitbitTokens {
  access_token: string;
  refresh_token: string;
  user_id: string;
  expires_in: number;
  scope: string;
}

export interface StoredTokens {
  id: string;
  user_id: string;
  fitbit_user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
  scope: string;
  fitbit_display_name?: string;
  fitbit_avatar_url?: string;
  fitbit_member_since?: string;
}

// Exchange authorization code for access tokens
export async function exchangeCodeForTokens(code: string): Promise<FitbitTokens> {
  console.log('🔵 TOKENS: Starting token exchange');
  console.log('🔵 TOKENS: Config:', {
    tokenUrl: FITBIT_CONFIG.tokenUrl,
    redirectUri: FITBIT_CONFIG.redirectUri,
    clientId: FITBIT_CONFIG.clientId,
  });

  const response = await fetch(FITBIT_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: FITBIT_CONFIG.redirectUri,
    }),
  });

  console.log('🔵 TOKENS: Response status:', response.status);

  if (!response.ok) {
    const error = await response.text();
    console.error('🔴 TOKENS: Exchange failed:', {
      status: response.status,
      error: error,
    });
    throw new Error(`Failed to exchange code for tokens: ${error}`);
  }

  const tokens = await response.json();
  console.log('🟢 TOKENS: Exchange successful');
  return tokens;
}

// Refresh access token using refresh token
export async function refreshAccessToken(refreshToken: string): Promise<FitbitTokens> {
  const response = await fetch(FITBIT_CONFIG.tokenUrl, {
    method: 'POST',
    headers: {
      'Authorization': getBasicAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to refresh token: ${error}`);
  }

  return await response.json();
}

// Store tokens in database
export async function storeTokens(userId: string, tokens: FitbitTokens): Promise<void> {
  console.log('🔵 DB: Storing tokens for user:', userId.substring(0, 8) + '...');
  
  const supabase = await createClient();
  
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  console.log('🔵 DB: Prepared data:', {
    userId: userId.substring(0, 8) + '...',
    fitbitUserId: tokens.user_id,
    expiresAt: expiresAt,
    scope: tokens.scope,
  });

  const { data, error } = await supabase
    .from('fitbit_tokens')
    .upsert({
      user_id: userId,
      fitbit_user_id: tokens.user_id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt,
      scope: tokens.scope,
    })
    .select();

  if (error) {
    console.error('🔴 DB: Failed to store tokens:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(`Failed to store tokens: ${error.message}`);
  }

  console.log('🟢 DB: Tokens stored successfully:', data);
}

// Get tokens for a user
export async function getTokensForUser(userId: string): Promise<StoredTokens | null> {
  const supabase = await createClient();
  
  const { data, error} = await supabase
    .from('fitbit_tokens')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

// Get valid access token (refresh if expired)
export async function getValidAccessToken(userId: string): Promise<string | null> {
  console.log('🔵 TOKEN: Getting valid access token for user:', userId.substring(0, 8) + '...');
  
  const tokens = await getTokensForUser(userId);
  
  if (!tokens) {
    console.error('🔴 TOKEN: No tokens found for user');
    return null;
  }

  console.log('🟢 TOKEN: Found tokens:', {
    fitbitUserId: tokens.fitbit_user_id,
    expiresAt: tokens.expires_at,
    scope: tokens.scope,
  });

  const expiresAt = new Date(tokens.expires_at);
  const now = new Date();
  
  console.log('🔵 TOKEN: Expiry check:', {
    expiresAt: expiresAt.toISOString(),
    now: now.toISOString(),
    expiresIn: Math.floor((expiresAt.getTime() - now.getTime()) / 1000 / 60) + ' minutes',
  });

  // If token expires in less than 5 minutes, refresh it
  const bufferTime = 5 * 60 * 1000; // 5 minutes
  if (expiresAt.getTime() - now.getTime() < bufferTime) {
    console.log('🔵 TOKEN: Token expiring soon, refreshing...');
    try {
      const newTokens = await refreshAccessToken(tokens.refresh_token);
      await storeTokens(userId, newTokens);
      console.log('🟢 TOKEN: Token refreshed successfully');
      return newTokens.access_token;
    } catch (error) {
      console.error('🔴 TOKEN: Failed to refresh token:', error);
      return null;
    }
  }

  console.log('🟢 TOKEN: Using existing token (still valid)');
  return tokens.access_token;
}

// Delete tokens (for disconnecting Fitbit)
export async function deleteTokens(userId: string): Promise<void> {
  const supabase = await createClient();
  
  const { error } = await supabase
    .from('fitbit_tokens')
    .delete()
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to delete tokens: ${error.message}`);
  }
}

// Check if user has connected Fitbit
export async function isUserConnected(userId: string): Promise<boolean> {
  const tokens = await getTokensForUser(userId);
  return tokens !== null;
}
