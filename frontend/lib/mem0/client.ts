import { MemoryClient } from 'mem0ai';

// Mem0 client singleton
let mem0Client: MemoryClient | null = null;

/**
 * Get or initialize Mem0 client
 */
export function getMem0Client(): MemoryClient {
  if (!mem0Client) {
    const apiKey = process.env.MEM0_API_KEY;

    if (!apiKey) {
      console.error('🔴 MEM0: API key not found in environment variables');
      throw new Error('MEM0_API_KEY is not set. Please add it to your .env.local file');
    }

    console.log('🟢 MEM0: Initializing client');
    mem0Client = new MemoryClient({ apiKey });
  }

  return mem0Client;
}

/**
 * Memory categories for organizing different types of memories
 */
export const MEMORY_CATEGORIES = {
  USER_PROFILE: 'user_profile',
  MENTAL_HEALTH: 'mental_health',
  GOALS: 'goals',
  HEALTH_INSIGHTS: 'health_insights',
  SOCIAL_CONTEXT: 'social_context',
  ACADEMIC: 'academic',
  TRIGGERS: 'triggers',
  CONVERSATION: 'conversation_insights',
} as const;

export type MemoryCategory = typeof MEMORY_CATEGORIES[keyof typeof MEMORY_CATEGORIES];

/**
 * Add a memory to Mem0 with proper error handling
 */
export async function addMemory(
  userId: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  metadata?: {
    category?: MemoryCategory;
    severity?: 'low' | 'moderate' | 'high';
    [key: string]: any;
  }
): Promise<{ success: boolean; memoryIds?: string[]; error?: string }> {
  try {
    console.log('🔵 MEM0: Adding memory for user:', userId.substring(0, 8) + '...');
    console.log('🔵 MEM0: Messages count:', messages.length);
    console.log('🔵 MEM0: Metadata:', metadata);

    const client = getMem0Client();

    const result = await client.add(messages, {
      user_id: userId,
      metadata: metadata || {},
    }) as any;

    // Debug: Log raw result
    console.log('🔵 MEM0: Raw add result:', JSON.stringify(result, null, 2));

    // Extract memory IDs from result - handle different response formats
    let memoryIds: string[] = [];

    if (Array.isArray(result)) {
      memoryIds = result.map((r: any) => r.id || r.memory_id).filter(Boolean);
    } else if (result?.results) {
      // Handle {results: [{id: ...}]} format
      memoryIds = Array.isArray(result.results)
        ? result.results.map((r: any) => r.id || r.memory_id).filter(Boolean)
        : [];
    } else if (result?.id || result?.memory_id) {
      memoryIds = [result.id || result.memory_id];
    }

    console.log('🟢 MEM0: Memory added successfully:', memoryIds.length, 'memories', memoryIds);

    return {
      success: true,
      memoryIds,
    };
  } catch (error: any) {
    console.error('🔴 MEM0: Error adding memory:', {
      message: error.message,
      userId: userId.substring(0, 8) + '...',
      metadata,
    });

    return {
      success: false,
      error: error.message || 'Failed to add memory',
    };
  }
}

/**
 * Search memories for a user with filters
 */
export async function searchMemories(
  userId: string,
  query: string,
  options?: {
    categories?: MemoryCategory[];
    limit?: number;
    threshold?: number;
  }
): Promise<{
  success: boolean;
  memories?: Array<{
    id: string;
    memory: string;
    category?: MemoryCategory;
    score: number;
    created_at?: string;
    metadata?: any;
  }>;
  error?: string;
}> {
  try {
    console.log('🔵 MEM0: Searching memories for user:', userId.substring(0, 8) + '...');
    console.log('🔵 MEM0: Query:', query.substring(0, 100));

    const client = getMem0Client();

    // Mem0 requires user_id in the search options, not in filters
    const searchOptions: any = {
      user_id: userId,
      limit: options?.limit || 5,
    };

    // Add category filter if specified
    if (options?.categories && options.categories.length > 0) {
      searchOptions.filters = {
        category: options.categories[0]
      };
    }

    console.log('🔵 MEM0: Search options:', JSON.stringify(searchOptions, null, 2));

    const result = await client.search(query, searchOptions) as any;

    // Debug: Log raw search result
    console.log('🔵 MEM0: Raw search result:', JSON.stringify(result, null, 2));

    // Parse results - handle different response formats
    let memories = [];

    if (Array.isArray(result)) {
      // Direct array of memories
      memories = result.map((r: any) => ({
        id: r.id || r.memory_id,
        memory: r.memory || r.text || r.content,
        category: r.metadata?.category || r.category,
        score: r.score || 0,
        created_at: r.created_at,
        metadata: r.metadata,
      }));
    } else if (result?.results && Array.isArray(result.results)) {
      // Nested results format
      memories = result.results.map((r: any) => ({
        id: r.id || r.memory_id,
        memory: r.memory || r.text || r.content,
        category: r.metadata?.category || r.category,
        score: r.score || 0,
        created_at: r.created_at,
        metadata: r.metadata,
      }));
    }

    console.log('🟢 MEM0: Found', memories.length, 'relevant memories');

    return {
      success: true,
      memories,
    };
  } catch (error: any) {
    console.error('🔴 MEM0: Error searching memories:', {
      message: error.message,
      userId: userId.substring(0, 8) + '...',
      query: query.substring(0, 100),
    });

    return {
      success: false,
      error: error.message || 'Failed to search memories',
    };
  }
}

/**
 * Get all memories for a user (for privacy/export features)
 */
export async function getAllMemories(
  userId: string
): Promise<{
  success: boolean;
  memories?: Array<{
    id: string;
    memory: string;
    category?: MemoryCategory;
    created_at?: string;
    metadata?: any;
  }>;
  error?: string;
}> {
  try {
    console.log('🔵 MEM0: Getting all memories for user:', userId.substring(0, 8) + '...');

    const client = getMem0Client();

    const result = await client.getAll({
      user_id: userId,
    }) as any;

    const memories = Array.isArray(result?.results)
      ? result.results.map((r: any) => ({
        id: r.id,
        memory: r.memory,
        category: r.metadata?.category,
        created_at: r.created_at,
        metadata: r.metadata,
      }))
      : [];

    console.log('🟢 MEM0: Retrieved', memories.length, 'total memories');

    return {
      success: true,
      memories,
    };
  } catch (error: any) {
    console.error('🔴 MEM0: Error getting all memories:', {
      message: error.message,
      userId: userId.substring(0, 8) + '...',
    });

    return {
      success: false,
      error: error.message || 'Failed to retrieve memories',
    };
  }
}

/**
 * Delete a specific memory
 */
export async function deleteMemory(
  memoryId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('🔵 MEM0: Deleting memory:', memoryId);

    const client = getMem0Client();
    await client.delete(memoryId);

    console.log('🟢 MEM0: Memory deleted successfully');

    return { success: true };
  } catch (error: any) {
    console.error('🔴 MEM0: Error deleting memory:', {
      message: error.message,
      memoryId,
    });

    return {
      success: false,
      error: error.message || 'Failed to delete memory',
    };
  }
}

/**
 * Delete all memories for a user (for privacy compliance)
 */
export async function deleteAllMemories(
  userId: string
): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  try {
    console.log('🔵 MEM0: Deleting all memories for user:', userId.substring(0, 8) + '...');

    // First, get all memories
    const { success, memories, error } = await getAllMemories(userId);

    if (!success || !memories) {
      throw new Error(error || 'Failed to retrieve memories for deletion');
    }

    // Delete each memory
    const client = getMem0Client();
    let deletedCount = 0;

    for (const memory of memories) {
      try {
        await client.delete(memory.id);
        deletedCount++;
      } catch (err) {
        console.warn('⚠️ MEM0: Failed to delete memory:', memory.id);
      }
    }

    console.log('🟢 MEM0: Deleted', deletedCount, 'memories');

    return {
      success: true,
      deletedCount,
    };
  } catch (error: any) {
    console.error('🔴 MEM0: Error deleting all memories:', {
      message: error.message,
      userId: userId.substring(0, 8) + '...',
    });

    return {
      success: false,
      error: error.message || 'Failed to delete memories',
    };
  }
}
