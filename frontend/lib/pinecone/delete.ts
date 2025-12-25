import { getPineconeClient } from './client';

/**
 * Delete all vectors associated with a document from Pinecone
 * @param documentId - The unique ID of the document
 */
export async function deleteFromPinecone(documentId: string): Promise<void> {
  try {
    const index = await getPineconeClient();
    
    // Delete all vectors with the matching documentId metadata
    await index.deleteMany({
      filter: {
        documentId: { $eq: documentId }
      }
    });

    console.log(`✅ Deleted all vectors for document: ${documentId}`);
  } catch (error: any) {
    console.error('Error deleting from Pinecone:', error);
    throw new Error(`Failed to delete vectors from Pinecone: ${error.message}`);
  }
}

/**
 * Delete specific vector IDs from Pinecone
 * @param vectorIds - Array of vector IDs to delete
 */
export async function deleteVectorsByIds(vectorIds: string[]): Promise<void> {
  try {
    const index = await getPineconeClient();
    
    await index.deleteMany(vectorIds);

    console.log(`✅ Deleted ${vectorIds.length} vectors from Pinecone`);
  } catch (error: any) {
    console.error('Error deleting vectors by IDs:', error);
    throw new Error(`Failed to delete vectors: ${error.message}`);
  }
}

/**
 * Delete all vectors in the index (use with caution!)
 */
export async function deleteAllVectors(): Promise<void> {
  try {
    const index = await getPineconeClient();
    
    await index.deleteAll();

    console.log('✅ Deleted all vectors from Pinecone index');
  } catch (error: any) {
    console.error('Error deleting all vectors:', error);
    throw new Error(`Failed to delete all vectors: ${error.message}`);
  }
}