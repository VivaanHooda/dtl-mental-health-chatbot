import { getPineconeClient } from '@/lib/pinecone/client';
import { generateEmbedding, getGeminiClient } from '@/lib/gemini/client';

export interface RetrievedChunk {
  text: string;
  metadata: {
    documentId: string;
    filename: string;
    chunkIndex: number;
    pageNumber?: number;
    paragraphIndex: number;
  };
  score: number;
}

/**
 * Enhance user query for better semantic search
 * Expands query with relevant mental health keywords without adding latency
 */
async function enhanceQuery(userQuery: string): Promise<string> {
  try {
    // Quick keyword expansion for common mental health topics (no API call)
    const lowerQuery = userQuery.toLowerCase();
    const keywords: string[] = [];
    
    // Detect topic and add relevant context keywords
    if (lowerQuery.match(/\b(stress|stressed|pressure|overwhelm)\b/)) {
      keywords.push('coping strategies', 'stress management', 'relaxation techniques');
    }
    if (lowerQuery.match(/\b(anxi(ety|ous)|worry|worries|nervous)\b/)) {
      keywords.push('anxiety relief', 'calming techniques', 'worry management');
    }
    if (lowerQuery.match(/\b(depress(ed|ion)|sad|down|hopeless)\b/)) {
      keywords.push('mood improvement', 'depression support', 'emotional wellness');
    }
    if (lowerQuery.match(/\b(sleep|insomnia|tired|fatigue)\b/)) {
      keywords.push('sleep hygiene', 'rest recovery', 'fatigue management');
    }
    if (lowerQuery.match(/\b(friend|relationship|social|lonely)\b/)) {
      keywords.push('social support', 'relationships', 'connection');
    }
    if (lowerQuery.match(/\b(exam|test|grade|study|academic)\b/)) {
      keywords.push('academic stress', 'study strategies', 'test anxiety');
    }
    
    // If query is very short (<10 words) and we found relevant keywords, enhance it
    const wordCount = userQuery.split(/\s+/).length;
    if (wordCount < 10 && keywords.length > 0) {
      const enhanced = `${userQuery} ${keywords.slice(0, 2).join(' ')}`;
      console.log('🔍 RAG: Enhanced query (keyword expansion):', enhanced.substring(0, 100));
      return enhanced;
    }
    
    return userQuery;
  } catch (error) {
    console.warn('⚠️ RAG: Query enhancement failed, using original query');
    return userQuery;
  }
}

/**
 * Query Pinecone vector database with semantic search
 * @param query - User's question/message
 * @param topK - Number of top results to return (default: 5)
 * @returns Array of relevant document chunks with metadata and similarity scores
 */
export async function queryRAG(
  query: string,
  topK: number = 5
): Promise<RetrievedChunk[]> {
  try {
    console.log('🔵 RAG: Processing query:', query.substring(0, 100));
    
    // Enhance query for better retrieval (fast keyword expansion)
    const enhancedQuery = await enhanceQuery(query);
    
    console.log('🔵 RAG: Generating embedding for enhanced query...');
    
    // Generate embedding for the enhanced query using Gemini
    const queryEmbedding = await generateEmbedding(enhancedQuery);
    
    console.log('🟢 RAG: Embedding generated, querying Pinecone...');
    
    // Query Pinecone - getPineconeClient() already returns the index
    const index = await getPineconeClient();
    
    const queryResponse = await index.query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
    });
    
    console.log('🟢 RAG: Found', queryResponse.matches.length, 'relevant chunks');
    
    // Extract and format results
    const results: RetrievedChunk[] = queryResponse.matches.map(match => ({
      text: (match.metadata?.text as string) || '',
      metadata: {
        documentId: (match.metadata?.documentId as string) || '',
        filename: (match.metadata?.filename as string) || '',
        chunkIndex: (match.metadata?.chunkIndex as number) || 0,
        pageNumber: match.metadata?.pageNumber as number | undefined,
        paragraphIndex: (match.metadata?.paragraphIndex as number) || 0,
      },
      score: match.score || 0,
    }));
    
    // Filter out low-quality matches (score < 0.3)
    const filteredResults = results.filter(r => r.score > 0.3);
    
    console.log('🟢 RAG: Returning', filteredResults.length, 'high-quality chunks (scores:', 
      filteredResults.map(r => r.score.toFixed(2)).join(', ') + ')');
    
    return filteredResults;
  } catch (error: any) {
    console.error('🔴 RAG: Error querying vector database:', error);
    throw new Error(`RAG query failed: ${error.message}`);
  }
}