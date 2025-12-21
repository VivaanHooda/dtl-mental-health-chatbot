import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getFitbitAuthUrl } from '@/lib/fitbit/config';

// GET /api/fitbit/authorize
// Redirects user to Fitbit OAuth authorization page
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized. Please log in first.' },
        { status: 401 }
      );
    }

    // Create state parameter with user ID for security
    const state = Buffer.from(JSON.stringify({
      userId: user.id,
      timestamp: Date.now()
    })).toString('base64');

    // Get Fitbit authorization URL
    const authUrl = getFitbitAuthUrl(state);

    // Redirect to Fitbit
    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error('Authorization error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate authorization' },
      { status: 500 }
    );
  }
}
