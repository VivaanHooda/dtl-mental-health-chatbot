// Persistent embedding cache to reduce API calls
import { createClient } from '@/lib/supabase/client';

interface CachedEmbedding {
  text: string;
  embedding: number[];
  created_at: string;
}

// In-memory cache (lasts for session)
const memoryCache = new Map<string, number[]>();

/**
 * Get embedding from cache (memory first, then database)
 * @param text - Text to get embedding for
 * @returns Cached embedding or null if not found
 */
export async function getCachedEmbedding(text: string): Promise<number[] | null> {
  const cacheKey = text.toLowerCase().trim();
  
  // Check memory cache first (fastest)
  if (memoryCache.has(cacheKey)) {
    console.log('✅ Cache hit (memory)');
    return memoryCache.get(cacheKey)!;
  }

  // Check database cache (persistent across sessions)
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('embedding_cache')
      .select('embedding')
      .eq('text_hash', hashText(text))
      .single();

    if (data && !error) {
      console.log('✅ Cache hit (database)');
      const embedding = data.embedding as number[];
      
      // Store in memory for faster subsequent access
      memoryCache.set(cacheKey, embedding);
      
      return embedding;
    }
  } catch (error) {
    console.warn('⚠️ Database cache lookup failed:', error);
  }

  return null;
}

/**
 * Save embedding to cache (both memory and database)
 * @param text - Original text
 * @param embedding - Generated embedding
 */
export async function saveCachedEmbedding(text: string, embedding: number[]): Promise<void> {
  const cacheKey = text.toLowerCase().trim();
  
  // Save to memory cache
  memoryCache.set(cacheKey, embedding);
  
  // Limit memory cache size
  if (memoryCache.size > 200) {
    const firstKey = memoryCache.keys().next().value;
    if (firstKey) {
      memoryCache.delete(firstKey);
    }
  }

  // Save to database cache (async, don't wait)
  try {
    const supabase = createClient();
    await supabase
      .from('embedding_cache')
      .upsert({
        text_hash: hashText(text),
        text: text.substring(0, 500), // Store truncated version for reference
        embedding: embedding,
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'text_hash'
      });
    console.log('💾 Embedding cached to database');
  } catch (error) {
    console.warn('⚠️ Failed to save to database cache:', error);
    // Don't throw - caching is optional
  }
}

/**
 * Simple hash function for text (for database lookup)
 * @param text - Text to hash
 * @returns Hash string
 */
function hashText(text: string): string {
  let hash = 0;
  const str = text.toLowerCase().trim();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

/**
 * Clear old cache entries (call periodically)
 * @param olderThanDays - Remove entries older than this many days
 */
export async function clearOldCache(olderThanDays: number = 30): Promise<void> {
  try {
    const supabase = createClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    await supabase
      .from('embedding_cache')
      .delete()
      .lt('created_at', cutoffDate.toISOString());
    
    console.log(`🗑️ Cleared cache entries older than ${olderThanDays} days`);
  } catch (error) {
    console.warn('⚠️ Failed to clear old cache:', error);
  }
}
