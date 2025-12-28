import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteFromPinecone } from '@/lib/pinecone/delete';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Await params in Next.js 16
    const { id } = await params;
    const documentId = id;

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 });
    }

    console.log(`🗑️ Deleting document: ${documentId}`);

    // First, get the document to verify it exists
    const { data: document, error: fetchError } = await supabase
      .from('admin_documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      console.error('Document not found:', fetchError);
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    console.log(`📄 Found document: ${document.filename}`);

    // Delete vectors from Pinecone
    try {
      console.log('🗑️ Deleting vectors from Pinecone...');
      await deleteFromPinecone(documentId);
      console.log('✅ Vectors deleted from Pinecone');
    } catch (pineconeError: any) {
      console.error('⚠️ Failed to delete from Pinecone:', pineconeError);
      // Continue with database deletion even if Pinecone fails
      // You might want to log this for manual cleanup
    }

    // Delete from Supabase
    console.log('🗑️ Deleting from database...');
    const { error: deleteError } = await supabase
      .from('admin_documents')
      .delete()
      .eq('id', documentId);

    if (deleteError) {
      console.error('❌ Database deletion error:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete document from database',
        details: deleteError.message 
      }, { status: 500 });
    }

    console.log('✅ Document deleted successfully');

    return NextResponse.json({
      success: true,
      message: `Document "${document.filename}" deleted successfully`,
      deletedId: documentId
    });

  } catch (error: any) {
    console.error('❌ Delete error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete document',
        details: error.message 
      },
      { status: 500 }
    );
  }
}