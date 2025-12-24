import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteDocumentFromPinecone } from '@/lib/pinecone/client';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  try {
    const supabase = await createClient();
    
    // Check if user is admin
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const documentId = id;

    // Get document info
    const { data: document, error: fetchError } = await supabase
      .from('admin_documents')
      .select('filename')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete from Pinecone
    console.log('🗑️  Deleting from Pinecone...');
    await deleteDocumentFromPinecone(documentId);

    // Delete from Supabase Storage
    console.log('🗑️  Deleting from Storage...');
    const { error: storageError } = await supabase.storage
      .from('admin-pdfs')
      .remove([document.filename]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('admin_documents')
      .delete()
      .eq('id', documentId);

    if (dbError) {
      throw new Error(`Failed to delete document: ${dbError.message}`);
    }

    console.log('✅ Document deleted');

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error: any) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete document' },
      { status: 500 }
    );
  }
}