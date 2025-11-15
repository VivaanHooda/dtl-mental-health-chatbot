import { Pinecone } from '@pinecone-database/pinecone';

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

// Generate dummy embeddings (1024 dimensions of RANDOM numbers)
// UPDATED: Now returns random values to avoid the "Dense vectors must contain at least one non-zero value" error
function generateDummyEmbedding(): number[] {
  // Create an array of 1024 random numbers between 0 and 1
  return Array.from({ length: 1024 }, () => Math.random());
}

// Store document chunks in Pinecone
export async function storeDocumentChunks(
  chunks: { text: string; metadata: any }[],
  documentId: string,
  filename: string
) {
  const pinecone = getPineconeClient();
  const index = pinecone.index(process.env.PINECONE_INDEX_NAME!);

  // Create vectors with dummy embeddings
  const vectors = chunks.map((chunk, idx) => ({
    id: `${documentId}-chunk-${idx}`,
    values: generateDummyEmbedding(), // Random embedding
    metadata: {
      ...chunk.metadata,
      documentId,
      filename,
      chunkIndex: idx,
      text: chunk.text, 
    },
  }));

  // Upsert vectors in batches of 100
  const batchSize = 100;
  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);
    try {
      await index.upsert(batch);
    } catch (error) {
      console.error(`Error upserting batch starting at index ${i}:`, error);
      throw error;
    }
  }

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