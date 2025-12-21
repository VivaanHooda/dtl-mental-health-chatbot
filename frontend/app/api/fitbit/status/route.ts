import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserConnected, getTokensForUser } from '@/lib/fitbit/tokens';

// GET /api/fitbit/status
// Check if user has connected their Fitbit
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check connection status
    const connected = await isUserConnected(user.id);
    
    let tokenInfo = null;
    if (connected) {
      const tokens = await getTokensForUser(user.id);
      if (tokens) {
        tokenInfo = {
          fitbitUserId: tokens.fitbit_user_id,
          scope: tokens.scope,
          expiresAt: tokens.expires_at,
          displayName: tokens.fitbit_display_name,
          avatarUrl: tokens.fitbit_avatar_url,
          memberSince: tokens.fitbit_member_since,
        };
      }
    }

    return NextResponse.json({
      connected,
      ...tokenInfo
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check connection status' },
      { status: 500 }
    );
  }
}
