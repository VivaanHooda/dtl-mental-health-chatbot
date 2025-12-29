/**
 * Ollama Client for Local LLM Inference
 * 
 * Replaces cloud-based Gemini with local Ollama service for:
 * - Chat/text generation
 * - Embedding generation
 */

// Configuration from environment variables
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL || 'nomic-embed-text';

// Timeout for requests (in ms)
const REQUEST_TIMEOUT = 120000; // 2 minutes for generation
const EMBED_TIMEOUT = 30000; // 30 seconds for embeddings

interface OllamaGenerateResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    eval_count?: number;
    eval_duration?: number;
}

interface OllamaChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface OllamaChatResponse {
    model: string;
    created_at: string;
    message: OllamaChatMessage;
    done: boolean;
    total_duration?: number;
    eval_count?: number;
}

interface OllamaEmbedResponse {
    embedding: number[];
}

/**
 * Check if Ollama service is running and accessible
 */
export async function checkOllamaHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        });
        return response.ok;
    } catch (error) {
        console.error('🔴 OLLAMA: Service not reachable at', OLLAMA_BASE_URL);
        return false;
    }
}

/**
 * List available models in Ollama
 */
export async function listOllamaModels(): Promise<string[]> {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
        });

        if (!response.ok) {
            throw new Error(`Failed to list models: ${response.statusText}`);
        }

        const data = await response.json();
        return data.models?.map((m: any) => m.name) || [];
    } catch (error: any) {
        console.error('🔴 OLLAMA: Error listing models:', error.message);
        return [];
    }
}

/**
 * Generate text using Ollama's generate API (non-chat format)
 * Use this for simple completions
 */
export async function generateText(
    prompt: string,
    options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
    }
): Promise<string> {
    const model = options?.model || OLLAMA_MODEL;

    console.log(`🔵 OLLAMA: Generating text with model: ${model}`);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: prompt,
                stream: false,
                options: {
                    temperature: options?.temperature ?? 0.7,
                    num_predict: options?.maxTokens ?? 2048,
                },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
        }

        const data: OllamaGenerateResponse = await response.json();
        console.log('🟢 OLLAMA: Text generation complete');

        return data.response;
    } catch (error: any) {
        console.error('🔴 OLLAMA: Generation error:', error.message);

        if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
            throw new Error('Ollama request timed out. The model may be loading or the prompt is too long.');
        }

        if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
            throw new Error(`Ollama service not running at ${OLLAMA_BASE_URL}. Please start Ollama.`);
        }

        throw new Error(`Failed to generate text: ${error.message}`);
    }
}

/**
 * Generate chat response using Ollama's chat API
 * Better for multi-turn conversations
 */
export async function generateChatResponse(
    messages: OllamaChatMessage[],
    options?: {
        model?: string;
        temperature?: number;
        maxTokens?: number;
        systemPrompt?: string;
    }
): Promise<string> {
    const model = options?.model || OLLAMA_MODEL;

    console.log(`🔵 OLLAMA: Chat generation with model: ${model}`);

    // Prepend system prompt if provided
    const allMessages = options?.systemPrompt
        ? [{ role: 'system' as const, content: options.systemPrompt }, ...messages]
        : messages;

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                messages: allMessages,
                stream: false,
                options: {
                    temperature: options?.temperature ?? 0.7,
                    num_predict: options?.maxTokens ?? 2048,
                },
            }),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama chat error: ${response.status} - ${errorText}`);
        }

        const data: OllamaChatResponse = await response.json();
        console.log('🟢 OLLAMA: Chat response generated');

        return data.message.content;
    } catch (error: any) {
        console.error('🔴 OLLAMA: Chat error:', error.message);

        if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
            throw new Error('Ollama request timed out. The model may be loading or the conversation is too long.');
        }

        if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
            throw new Error(`Ollama service not running at ${OLLAMA_BASE_URL}. Please start Ollama.`);
        }

        throw new Error(`Failed to generate chat response: ${error.message}`);
    }
}

/**
 * Generate embeddings using Ollama's embeddings API
 * 
 * Note: Different embedding models produce different dimensions:
 * - nomic-embed-text: 768 dimensions
 * - mxbai-embed-large: 1024 dimensions
 * - all-minilm: 384 dimensions
 * 
 * Make sure to use the same model for both storing and querying vectors!
 */
export async function generateEmbedding(
    text: string,
    options?: {
        model?: string;
    }
): Promise<number[]> {
    const model = options?.model || OLLAMA_EMBED_MODEL;

    console.log(`🔵 OLLAMA: Generating embedding with model: ${model}`);

    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
                prompt: text,
            }),
            signal: AbortSignal.timeout(EMBED_TIMEOUT),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Ollama embedding error: ${response.status} - ${errorText}`);
        }

        const data: OllamaEmbedResponse = await response.json();

        if (!data.embedding || !Array.isArray(data.embedding)) {
            throw new Error('Invalid embedding response from Ollama');
        }

        console.log(`🟢 OLLAMA: Embedding generated (${data.embedding.length} dimensions)`);

        return data.embedding;
    } catch (error: any) {
        console.error('🔴 OLLAMA: Embedding error:', error.message);

        if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
            throw new Error('Ollama embedding request timed out.');
        }

        if (error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
            throw new Error(`Ollama service not running at ${OLLAMA_BASE_URL}. Please start Ollama.`);
        }

        // Check if embedding model needs to be pulled
        if (error.message?.includes('not found') || error.message?.includes('does not exist')) {
            throw new Error(`Embedding model '${model}' not found. Run: ollama pull ${model}`);
        }

        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

/**
 * Batch generate embeddings for multiple texts
 * Processes sequentially to avoid overwhelming local resources
 */
export async function generateEmbeddingsBatch(
    texts: string[],
    options?: {
        model?: string;
        onProgress?: (completed: number, total: number) => void;
    }
): Promise<number[][]> {
    const embeddings: number[][] = [];

    for (let i = 0; i < texts.length; i++) {
        const embedding = await generateEmbedding(texts[i], { model: options?.model });
        embeddings.push(embedding);

        if (options?.onProgress) {
            options.onProgress(i + 1, texts.length);
        }
    }

    return embeddings;
}

/**
 * Get embedding dimension for a model
 * Useful for validating Pinecone index compatibility
 */
export async function getEmbeddingDimension(model?: string): Promise<number> {
    const testEmbedding = await generateEmbedding('test', { model });
    return testEmbedding.length;
}

// Export configuration for use in other modules
export const ollamaConfig = {
    baseUrl: OLLAMA_BASE_URL,
    chatModel: OLLAMA_MODEL,
    embedModel: OLLAMA_EMBED_MODEL,
};
