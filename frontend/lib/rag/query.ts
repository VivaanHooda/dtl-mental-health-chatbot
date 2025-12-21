import { getPineconeClient } from '@/lib/pinecone/client';
import { generateEmbedding } from '@/lib/gemini/client';

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
    console.log('🔵 RAG: Generating embedding for query:', query.substring(0, 100));
    
    // Generate embedding for the user's query using Gemini
    const queryEmbedding = await generateEmbedding(query);
    
    console.log('🟢 RAG: Embedding generated, querying Pinecone...');
    
    // Query Pinecone
    const pinecone = getPineconeClient();
    const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);
    
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
    
    console.log('🟢 RAG: Returning', filteredResults.length, 'high-quality chunks');
    
    return filteredResults;
  } catch (error: any) {
    console.error('🔴 RAG: Error querying vector database:', error);
    throw new Error(`RAG query failed: ${error.message}`);
  }
}