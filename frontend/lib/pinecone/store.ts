import { getPineconeClient } from './client';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini client initialization
let genAI: GoogleGenerativeAI | null = null;
const embeddingCache = new Map<string, number[]>();

function initGenAI(): GoogleGenerativeAI {
  if (genAI) return genAI;
  
  const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables');
  }
  
  genAI = new GoogleGenerativeAI(apiKey);
  return genAI;
}

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Check cache
    const cacheKey = text.substring(0, 100);
    if (embeddingCache.has(cacheKey)) {
      return embeddingCache.get(cacheKey)!;
    }

    const client = initGenAI();
    const model = client.getGenerativeModel({ model: 'text-embedding-004' });
    const result = await model.embedContent(text);
    const embedding = result.embedding.values;

    // Cache result
    embeddingCache.set(cacheKey, embedding);
    
    // Limit cache size
    if (embeddingCache.size > 1000) {
      const firstKey = embeddingCache.keys().next().value;
      if (firstKey) {
        embeddingCache.delete(firstKey);
      }
    }

    return embedding;
  } catch (error: any) {
    console.error('Error generating embedding:', error);
    if (error.message?.includes('429') || error.message?.includes('quota')) {
      throw new Error('Gemini API rate limit exceeded. Please wait and try again.');
    }
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}

export interface Chunk {
  text: string;
  metadata?: {
    pageNumber?: number;
    paragraphIndex?: number;
    totalParagraphs?: number;
    [key: string]: any;
  };
  contentType?: 'text' | 'table' | 'image';
  structuredData?: any;
}

export interface VectorRecord {
  id: string;
  values: number[];
  metadata: {
    documentId: string;
    filename: string;
    text: string;
    pageNumber?: number;
    contentType?: string;
    chunkIndex: number;
    [key: string]: any;
  };
}

/**
 * Store chunks in Pinecone vector database
 * @param chunks - Array of text chunks to store
 * @param documentId - Unique document identifier
 * @param filename - Original filename
 */
export async function storeInPinecone(
  chunks: Chunk[],
  documentId: string,
  filename: string
): Promise<void> {
  try {
    const index = await getPineconeClient();
    
    console.log(`📊 Storing ${chunks.length} chunks for document: ${filename}`);

    // Process chunks in batches to avoid rate limits
    const batchSize = 100;
    const batches = [];
    
    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize));
    }

    console.log(`📦 Processing ${batches.length} batches (${batchSize} chunks per batch)`);

    let totalStored = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      
      console.log(`⚙️ Processing batch ${batchIndex + 1}/${batches.length} (${batch.length} chunks)...`);

      // Generate embeddings for all chunks in batch
      const vectors: VectorRecord[] = [];

      for (let i = 0; i < batch.length; i++) {
        const chunk = batch[i];
        const globalIndex = batchIndex * batchSize + i;

        try {
          // Generate embedding
          const embedding = await generateEmbedding(chunk.text);

          // Create vector record
          const vectorId = `${documentId}_chunk_${globalIndex}`;
          
          vectors.push({
            id: vectorId,
            values: embedding,
            metadata: {
              documentId,
              filename,
              text: chunk.text,
              pageNumber: chunk.metadata?.pageNumber,
              contentType: chunk.contentType || 'text',
              chunkIndex: globalIndex,
              // Include any additional metadata
              ...chunk.metadata,
              // Store structured data if available (for tables/images)
              ...(chunk.structuredData && { 
                hasStructuredData: true,
                structuredDataType: chunk.contentType 
              }),
            },
          });

          // Add a small delay between embedding calls to avoid rate limits
          if (i < batch.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (error: any) {
          console.error(`❌ Error processing chunk ${globalIndex}:`, error.message);
          // Continue with other chunks even if one fails
          continue;
        }
      }

      // Upsert batch to Pinecone
      if (vectors.length > 0) {
        try {
          await index.upsert(vectors);
          totalStored += vectors.length;
          console.log(`✅ Batch ${batchIndex + 1} stored: ${vectors.length} vectors`);
        } catch (upsertError: any) {
          console.error(`❌ Failed to upsert batch ${batchIndex + 1}:`, upsertError.message);
          throw upsertError;
        }
      }

      // Add delay between batches
      if (batchIndex < batches.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Successfully stored ${totalStored}/${chunks.length} vectors in Pinecone`);

    if (totalStored < chunks.length) {
      console.warn(`⚠️ Warning: Only ${totalStored} out of ${chunks.length} chunks were stored`);
    }

  } catch (error: any) {
    console.error('❌ Error storing in Pinecone:', error);
    throw new Error(`Failed to store vectors in Pinecone: ${error.message}`);
  }
}

/**
 * Store a single chunk in Pinecone
 * @param chunk - Single chunk to store
 * @param documentId - Unique document identifier
 * @param filename - Original filename
 * @param chunkIndex - Index of the chunk
 */
export async function storeSingleChunk(
  chunk: Chunk,
  documentId: string,
  filename: string,
  chunkIndex: number
): Promise<void> {
  try {
    const index = await getPineconeClient();

    // Generate embedding
    const embedding = await generateEmbedding(chunk.text);

    // Create vector record
    const vectorId = `${documentId}_chunk_${chunkIndex}`;
    
    const vector: VectorRecord = {
      id: vectorId,
      values: embedding,
      metadata: {
        documentId,
        filename,
        text: chunk.text,
        pageNumber: chunk.metadata?.pageNumber,
        contentType: chunk.contentType || 'text',
        chunkIndex,
        ...chunk.metadata,
      },
    };

    // Upsert to Pinecone
    await index.upsert([vector]);

    console.log(`✅ Stored single chunk: ${vectorId}`);
  } catch (error: any) {
    console.error('❌ Error storing single chunk:', error);
    throw new Error(`Failed to store chunk in Pinecone: ${error.message}`);
  }
}

/**
 * Update vectors for a document (useful for re-processing)
 * @param chunks - New chunks to store
 * @param documentId - Unique document identifier
 * @param filename - Original filename
 */
export async function updateDocumentVectors(
  chunks: Chunk[],
  documentId: string,
  filename: string
): Promise<void> {
  try {
    // First delete existing vectors
    const index = await getPineconeClient();
    
    await index.deleteMany({
      filter: {
        documentId: { $eq: documentId }
      }
    });

    console.log(`🗑️ Deleted existing vectors for document: ${documentId}`);

    // Then store new vectors
    await storeInPinecone(chunks, documentId, filename);

    console.log(`✅ Updated vectors for document: ${documentId}`);
  } catch (error: any) {
    console.error('❌ Error updating document vectors:', error);
    throw new Error(`Failed to update vectors: ${error.message}`);
  }
}