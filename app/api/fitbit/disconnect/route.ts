import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteTokens } from '@/lib/fitbit/tokens';

// POST /api/fitbit/disconnect
// Disconnects Fitbit by deleting stored tokens
export async function POST(request: NextRequest) {
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

    // Delete tokens from database
    await deleteTokens(user.id);

    // Also delete all Fitbit data
    await supabase
      .from('fitbit_data')
      .delete()
      .eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      message: 'Fitbit disconnected successfully'
    });
  } catch (error: any) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Fitbit' },
      { status: 500 }
    );
  }
}
