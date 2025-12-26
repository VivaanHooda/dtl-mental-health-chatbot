import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Helper to add no-cache headers
function createNoCacheResponse(data: any, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  });
}

// GET - Get emergency contact
export async function GET(request: NextRequest) {
  console.log('\n========================================');
  console.log('🔵 GET /api/emergency-contact');
  console.log('========================================');
  
  try {
    const supabase = await createClient();
    console.log('✅ Supabase client created');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    console.log('Auth result:', {
      hasUser: !!user,
      userId: user?.id,
      email: user?.email,
      error: authError?.message
    });
    
    if (authError || !user) {
      console.log('❌ No authenticated user');
      return createNoCacheResponse({ 
        success: false,
        error: 'Unauthorized' 
      }, 401);
    }

    console.log('🔵 Querying user_profiles for user_id:', user.id);
    
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('emergency_contact_email, user_id, email, username')
      .eq('user_id', user.id)
      .single();

    console.log('Query result:', {
      profile,
      error: profileError,
      errorCode: profileError?.code,
      errorMessage: profileError?.message,
    });

    if (profileError) {
      console.log('❌ Profile query error:', profileError);
      
      if (profileError.code === 'PGRST116') {
        console.log('⚠️ Profile not found, returning empty');
        return createNoCacheResponse({
          success: true,
          emergencyContactEmail: null,
          isLinked: false,
        });
      }
      
      return createNoCacheResponse({
        success: false,
        error: 'Failed to fetch profile',
        details: profileError.message
      }, 500);
    }

    const email = profile?.emergency_contact_email;
    const linked = email !== null && email !== undefined && email !== '';

    console.log('✅ Returning:', {
      emergencyContactEmail: email,
      isLinked: linked,
      profileFound: !!profile
    });
    console.log('========================================\n');

    return createNoCacheResponse({
      success: true,
      emergencyContactEmail: email,
      isLinked: linked,
    });
  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    console.error('Stack:', error.stack);
    return createNoCacheResponse(
      { 
        success: false,
        error: 'Failed to fetch emergency contact',
        details: error.message 
      },
      500
    );
  }
}

// POST - Link emergency contact
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createNoCacheResponse({ 
        success: false,
        error: 'Unauthorized' 
      }, 401);
    }

    const body = await request.json();
    const { emergencyContactEmail } = body;

    if (!emergencyContactEmail || typeof emergencyContactEmail !== 'string') {
      return createNoCacheResponse(
        { 
          success: false,
          error: 'Valid email is required' 
        },
        400
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emergencyContactEmail)) {
      return createNoCacheResponse(
        { 
          success: false,
          error: 'Invalid email format' 
        },
        400
      );
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ emergency_contact_email: emergencyContactEmail })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error updating emergency contact:', updateError);
      return createNoCacheResponse(
        { 
          success: false,
          error: 'Failed to update emergency contact',
          details: updateError.message 
        },
        500
      );
    }

    return createNoCacheResponse({
      success: true,
      message: 'Emergency contact linked successfully',
      emergencyContactEmail,
    });
  } catch (error: any) {
    console.error('Error linking emergency contact:', error);
    return createNoCacheResponse(
      { 
        success: false,
        error: 'Failed to link emergency contact',
        details: error.message 
      },
      500
    );
  }
}

// DELETE - Remove emergency contact
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return createNoCacheResponse({ 
        success: false,
        error: 'Unauthorized' 
      }, 401);
    }

    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ emergency_contact_email: null })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Error removing emergency contact:', updateError);
      return createNoCacheResponse(
        { 
          success: false,
          error: 'Failed to remove emergency contact',
          details: updateError.message 
        },
        500
      );
    }

    return createNoCacheResponse({
      success: true,
      message: 'Emergency contact removed successfully',
    });
  } catch (error: any) {
    console.error('Error removing emergency contact:', error);
    return createNoCacheResponse(
      { 
        success: false,
        error: 'Failed to remove emergency contact',
        details: error.message 
      },
      500
    );
  }
}