import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processPDF } from '@/lib/pdf/processor';
import { storeDocumentChunks } from '@/lib/pinecone/client';

export async function POST(request: NextRequest) {
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

    // Get the uploaded file
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    console.log('📄 Processing PDF:', file.name, 'Size:', file.size);

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate unique document ID
    const documentId = crypto.randomUUID();
    const timestamp = Date.now();
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storageFilename = `${timestamp}-${sanitizedFilename}`;

    // Upload to Supabase Storage
    console.log('☁️  Uploading to Supabase Storage...');
    const { error: uploadError } = await supabase.storage
      .from('admin-pdfs')
      .upload(storageFilename, buffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Storage upload error:', uploadError);
      throw new Error(`Failed to upload file: ${uploadError.message}`);
    }

    // Process PDF and extract chunks
    console.log('📖 Extracting text from PDF...');
    const chunks = await processPDF(buffer);
    console.log(`✂️  Created ${chunks.length} chunks`);

    // Store chunks in Pinecone (with dummy embeddings for now)
    console.log('🔍 Storing in Pinecone vector database...');
    await storeDocumentChunks(chunks, documentId, file.name);
    console.log('✅ Stored in Pinecone');

    // Save metadata to database
    const { data: document, error: dbError } = await supabase
      .from('admin_documents')
      .insert({
        id: documentId,
        filename: storageFilename,
        original_filename: file.name,
        file_size: file.size,
        uploaded_by: user.id,
        num_chunks: chunks.length,
        status: 'completed',
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      throw new Error(`Failed to save document metadata: ${dbError.message}`);
    }

    console.log('🎉 Upload complete!');

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.original_filename,
        numChunks: document.num_chunks,
        uploadDate: document.upload_date,
      },
    });
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}