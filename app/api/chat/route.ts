import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queryRAG } from '@/lib/rag/query';
import { generateWithContext } from '@/lib/gemini/client';

export async function POST(request: NextRequest) {
  console.log('🔵 CHAT: Received chat request');
  
  try {
    const supabase = await createClient();
    
    // Check if user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('🔴 CHAT: Auth failed:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🟢 CHAT: User authenticated:', user.id.substring(0, 8) + '...');

    // Parse request body
    const body = await request.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    console.log('🔵 CHAT: User message:', message.substring(0, 100));

    // Step 1: Query RAG system to get relevant context (optional - gracefully handle failures)
    let relevantChunks: any[] = [];
    const ragEnabled = process.env.ENABLE_RAG !== 'false'; // Default to true unless explicitly disabled
    
    if (ragEnabled) {
      try {
        console.log('🔵 CHAT: Querying RAG system...');
        relevantChunks = await queryRAG(message, 5);
        console.log('🟢 CHAT: Retrieved', relevantChunks.length, 'context chunks');
        
        // Log the sources being used
        if (relevantChunks.length > 0) {
          console.log('📚 CHAT: Using context from:', 
            [...new Set(relevantChunks.map(c => c.metadata.filename))].join(', ')
          );
        }
      } catch (ragError: any) {
        console.warn('⚠️ CHAT: RAG query failed, continuing without context:', ragError.message);
        // Continue without RAG context - this is not critical for basic chat
      }
    } else {
      console.log('⚪ CHAT: RAG disabled via environment variable, skipping context retrieval');
    }

    // Step 2: Generate response using Gemini with RAG context (if available)
    console.log('🔵 CHAT: Generating response with Gemini...');
    const response = await generateWithContext(
      message,
      relevantChunks,
      conversationHistory || []
    );

    console.log('🟢 CHAT: Response generated successfully');

    // Step 3: Store the conversation in database (optional, for history)
    try {
      await supabase.from('chat_messages').insert([
        {
          user_id: user.id,
          role: 'user',
          content: message,
          created_at: new Date().toISOString(),
        },
        {
          user_id: user.id,
          role: 'assistant',
          content: response,
          created_at: new Date().toISOString(),
        },
      ]);
      console.log('🟢 CHAT: Conversation saved to database');
    } catch (dbError) {
      console.warn('⚠️ CHAT: Failed to save conversation:', dbError);
      // Don't fail the request if DB save fails
    }

    // Return response with metadata about sources used
    return NextResponse.json({
      success: true,
      response: response,
      sources: relevantChunks.map(chunk => ({
        filename: chunk.metadata.filename,
        score: chunk.score,
        pageNumber: chunk.metadata.pageNumber,
      })),
      contextUsed: relevantChunks.length > 0,
    });

  } catch (error: any) {
    console.error('🔴 CHAT: Error occurred:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Return user-friendly error message
    let errorMessage = error.message || 'Failed to generate response';
    
    // Check for common issues
    if (error.message?.includes('GEMINI_API_KEY')) {
      errorMessage = 'Gemini API key is not configured. Please contact the administrator.';
    } else if (error.message?.includes('PINECONE')) {
      errorMessage = 'Vector database is not configured properly. Some features may be limited.';
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