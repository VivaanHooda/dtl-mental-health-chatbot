import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { processWithDocling } from '@/lib/pdf/docling-processor';
import { storeInPinecone } from '@/lib/pinecone/store';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
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

    // Get file from form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Validate file size (e.g., max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File size exceeds 50MB limit' }, { status: 400 });
    }

    console.log(`📄 Processing PDF: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);

    // Convert to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process with Docling
    console.log('🔄 Extracting content with Docling...');
    const chunks = await processWithDocling(buffer);

    if (!chunks || chunks.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to extract content from PDF. The file may be corrupted or empty.' 
      }, { status: 400 });
    }

    console.log(`✅ Extracted ${chunks.length} chunks from ${file.name}`);

    // Calculate detailed statistics
    const stats = chunks.reduce((acc, chunk) => {
      acc.total++;
      if (chunk.contentType === 'text') acc.text++;
      else if (chunk.contentType === 'table') acc.table++;
      else if (chunk.contentType === 'image') acc.image++;
      return acc;
    }, { total: 0, text: 0, table: 0, image: 0 });

    // Extract total pages from chunk metadata
    const allPages = chunks
      .map(c => c.metadata?.pageNumber || 1)
      .filter(p => p > 0);
    const totalPages = allPages.length > 0 ? Math.max(...allPages) : 1;

    console.log(`📊 Statistics: ${stats.text} text, ${stats.table} tables, ${stats.image} images across ${totalPages} pages`);

    // Generate unique document ID
    const docId = crypto.randomUUID();

    // Store vectors in Pinecone
    console.log(`💾 Storing ${chunks.length} vectors in Pinecone...`);
    try {
      await storeInPinecone(chunks, docId, file.name);
      console.log('✅ Successfully stored vectors in Pinecone');
    } catch (pineconeError: any) {
      console.error('❌ Pinecone storage error:', pineconeError);
      return NextResponse.json({ 
        error: `Failed to store vectors in Pinecone: ${pineconeError.message}` 
      }, { status: 500 });
    }

    // Calculate processing time
    const processingTime = (Date.now() - startTime) / 1000;

    // Save metadata to Supabase
    console.log('💾 Saving document metadata to Supabase...');
    const { data: document, error: dbError } = await supabase
      .from('admin_documents')
      .insert({
        id: docId,
        filename: file.name,
        original_filename: file.name,  // Add this too
        file_size: file.size,
        upload_date: new Date().toISOString(),
        num_chunks: chunks.length,
        status: 'processed',
        metadata: {
          totalChunks: chunks.length,
          textChunks: stats.text,
          tableChunks: stats.table,
          imageChunks: stats.image,
          totalPages: totalPages,
          processingTime: processingTime,
          contentTypes: {
            text: stats.text,
            table: stats.table,
            image: stats.image,
          },
          processor: 'docling',
          processedAt: new Date().toISOString(),
          geminiModel: 'gemini-1.5-flash',
          mimeType: file.type, // Store in metadata instead
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('❌ Database error:', dbError);
      // Try to clean up Pinecone vectors if database save failed
      // Note: You might want to implement cleanup logic here
      return NextResponse.json({ 
        error: `Failed to save document metadata: ${dbError.message}` 
      }, { status: 500 });
    }

    console.log(`✅ Document uploaded successfully in ${processingTime.toFixed(2)}s`);

    // Return success response with detailed stats
    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        filename: document.filename,
        numChunks: document.num_chunks,
        stats: {
          text: stats.text,
          tables: stats.table,
          images: stats.image,
          pages: totalPages,
          processingTime: processingTime,
        }
      },
      message: `Successfully processed ${file.name} - ${chunks.length} chunks stored in vector database`
    });

  } catch (error: any) {
    console.error('❌ Upload error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Upload failed';
    if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Note: bodyParser config is not needed in Next.js 16 app router
// FormData is handled automatically