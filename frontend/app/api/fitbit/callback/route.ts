import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { exchangeCodeForTokens, storeTokens } from '@/lib/fitbit/tokens';

// GET /api/fitbit/callback
// Handles the OAuth callback from Fitbit
export async function GET(request: NextRequest) {
  console.log('🔵 CALLBACK: Started processing callback');
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    console.log('🔵 CALLBACK: Received params:', {
      hasCode: !!code,
      hasState: !!state,
      hasError: !!error,
      code: code?.substring(0, 20) + '...',
    });

    // Check for errors from Fitbit
    if (error) {
      console.error('🔴 CALLBACK: Fitbit authorization error:', error);
      return NextResponse.redirect(
        new URL(`/dashboard?fitbit_error=${error}`, request.url)
      );
    }

    // Validate we have a code
    if (!code) {
      console.error('🔴 CALLBACK: No code received');
      return NextResponse.redirect(
        new URL('/dashboard?fitbit_error=no_code', request.url)
      );
    }

    // Verify state parameter
    let userId: string;
    try {
      console.log('🔵 CALLBACK: Decoding state parameter');
      const stateData = JSON.parse(
        Buffer.from(state || '', 'base64').toString()
      );
      userId = stateData.userId;

      console.log('🔵 CALLBACK: State decoded:', {
        userId: userId.substring(0, 8) + '...',
        timestamp: new Date(stateData.timestamp).toISOString(),
      });

      // Check state is not too old (5 minutes)
      const stateAge = Date.now() - stateData.timestamp;
      if (stateAge > 5 * 60 * 1000) {
        console.error('🔴 CALLBACK: State expired:', stateAge / 1000, 'seconds old');
        throw new Error('State expired');
      }
    } catch (err) {
      console.error('🔴 CALLBACK: Invalid state parameter:', err);
      return NextResponse.redirect(
        new URL('/dashboard?fitbit_error=invalid_state', request.url)
      );
    }

    // Verify user is authenticated
    console.log('🔵 CALLBACK: Verifying user authentication');
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user || user.id !== userId) {
      console.error('🔴 CALLBACK: Auth failed:', {
        authError: authError?.message,
        hasUser: !!user,
        userIdMatch: user?.id === userId,
      });
      return NextResponse.redirect(
        new URL('/login?error=unauthorized', request.url)
      );
    }

    console.log('🟢 CALLBACK: User authenticated:', user.id.substring(0, 8) + '...');

    // Exchange code for tokens
    console.log('🔵 CALLBACK: Exchanging code for tokens...');
    const tokens = await exchangeCodeForTokens(code);
    
    console.log('🟢 CALLBACK: Tokens received:', {
      fitbitUserId: tokens.user_id,
      scope: tokens.scope,
      expiresIn: tokens.expires_in,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
    });

    // Store tokens in database
    console.log('🔵 CALLBACK: Storing tokens in database...');
    await storeTokens(userId, tokens);
    console.log('🟢 CALLBACK: Tokens stored successfully!');

    // Redirect to dashboard with success message
    console.log('🟢 CALLBACK: Redirecting to dashboard');
    return NextResponse.redirect(
      new URL('/dashboard?fitbit_connected=true', request.url)
    );
  } catch (error: any) {
    console.error('🔴 CALLBACK: Error occurred:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.redirect(
      new URL(`/dashboard?fitbit_error=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
