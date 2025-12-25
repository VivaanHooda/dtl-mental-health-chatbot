import { Pinecone } from '@pinecone-database/pinecone';

let pineconeClient: Pinecone | null = null;

/**
 * Initialize and return Pinecone client
 */
export function initPinecone(): Pinecone {
  if (pineconeClient) {
    return pineconeClient;
  }

  const apiKey = process.env.PINECONE_API_KEY;
  
  if (!apiKey) {
    throw new Error('PINECONE_API_KEY is not set in environment variables');
  }

  pineconeClient = new Pinecone({
    apiKey: apiKey,
  });

  return pineconeClient;
}

/**
 * Get Pinecone index
 */
export async function getPineconeClient() {
  const client = initPinecone();
  
  const indexName = process.env.PINECONE_INDEX_NAME;
  
  if (!indexName) {
    throw new Error('PINECONE_INDEX_NAME is not set in environment variables');
  }

  const index = client.index(indexName);
  
  return index;
}

/**
 * Check if Pinecone index exists and is ready
 */
export async function checkPineconeHealth(): Promise<boolean> {
  try {
    const client = initPinecone();
    const indexName = process.env.PINECONE_INDEX_NAME;
    
    if (!indexName) {
      throw new Error('PINECONE_INDEX_NAME is not set');
    }

    const indexList = await client.listIndexes();
    const indexExists = indexList.indexes?.some(idx => idx.name === indexName);
    
    if (!indexExists) {
      console.error(`Index "${indexName}" does not exist`);
      return false;
    }

    return true;
  } catch (error: any) {
    console.error('Pinecone health check failed:', error);
    return false;
  }
}

/**
 * Get index statistics
 */
export async function getIndexStats() {
  try {
    const index = await getPineconeClient();
    const stats = await index.describeIndexStats();
    return stats;
  } catch (error: any) {
    console.error('Failed to get index stats:', error);
    throw error;
  }
}