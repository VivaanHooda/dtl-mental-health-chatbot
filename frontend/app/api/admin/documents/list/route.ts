import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check admin role
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Fetch all documents with metadata
    const { data: documents, error: fetchError } = await supabase
      .from('admin_documents')
      .select('*')
      .order('upload_date', { ascending: false });

    if (fetchError) {
      console.error('Error fetching documents:', fetchError);
      return NextResponse.json({ 
        error: 'Failed to fetch documents',
        details: fetchError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
      count: documents?.length || 0
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error: any) {
    console.error('List documents error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list documents',
        details: error.message 
      },
      { status: 500 }
    );
  }
}