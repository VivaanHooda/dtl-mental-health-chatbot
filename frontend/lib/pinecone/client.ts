import { Pinecone } from '@pinecone-database/pinecone';
import { generateEmbedding } from '@/lib/gemini/client';

// Initialize Pinecone client
let pineconeClient: Pinecone | null = null;

export function getPineconeClient(): Pinecone {
  if (!pineconeClient) {
    pineconeClient = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY!,
    });
  }
  return pineconeClient;
}

// Store document chunks in Pinecone with real Gemini embeddings
export async function storeDocumentChunks(
  chunks: { text: string; metadata: any }[],
  documentId: string,
  filename: string
) {
  const pinecone = getPineconeClient();
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  console.log('🔵 PINECONE: Generating embeddings for', chunks.length, 'chunks...');
  
  // Generate embeddings for all chunks
  const embeddingsPromises = chunks.map(chunk => generateEmbedding(chunk.text));
  const embeddings = await Promise.all(embeddingsPromises);
  
  console.log('🟢 PINECONE: All embeddings generated');

  // Create vectors with real Gemini embeddings
  const vectors = chunks.map((chunk, idx) => ({
    id: `${documentId}-chunk-${idx}`,
    values: embeddings[idx],
    metadata: {
      ...chunk.metadata,
      documentId,
      filename,
      chunkIndex: idx,
      text: chunk.text, 
    },
  }));

  console.log('🔵 PINECONE: Upserting vectors to index...');

  // Upsert vectors in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    try {
      await index.upsert(batch);
      console.log(`🟢 PINECONE: Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
    } catch (error) {
      console.error(`Error upserting batch starting at index ${i}:`, error);
      throw error;
    }
  }

  console.log('🟢 PINECONE: All vectors stored successfully');
  return vectors.length;
}

// Delete document from Pinecone
export async function deleteDocumentFromPinecone(documentId: string) {
  const pinecone = getPineconeClient();
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  try {
      // 1. List vectors with this prefix
      const list = await index.listPaginated({ prefix: `${documentId}-` });
      
      // 2. Delete them by ID
      if (list.vectors && list.vectors.length > 0) {
        const idsToDelete = list.vectors.map(v => v.id!);
        await index.deleteMany(idsToDelete);
      }
  } catch (error) {
      console.error("Error deleting document from Pinecone:", error);
      throw error;
  }
}