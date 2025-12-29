/**
 * Gemini Flash Client
 * 
 * Uses the new @google/genai SDK (googleapis/js-genai) for function calling.
 * This client is specifically for tool orchestration with Gemini Flash,
 * NOT for direct chat generation (which uses Ollama/DeepSeek).
 */

import { GoogleGenAI, FunctionCallingConfigMode, Type } from '@google/genai';

// Singleton instance
let flashClient: GoogleGenAI | null = null;

/**
 * Get or create the Gemini Flash client
 */
export function getFlashClient(): GoogleGenAI {
    if (!flashClient) {
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error(
                'GEMINI_API_KEY is not set. Get your free API key from https://aistudio.google.com/apikey'
            );
        }

        flashClient = new GoogleGenAI({ apiKey });
        console.log('🟢 FLASH: Gemini Flash client initialized');
    }

    return flashClient;
}

/**
 * Flash model configuration
 */
export const flashConfig = {
    model: 'gemini-2.5-flash',
    functionCallingMode: FunctionCallingConfigMode.AUTO,
    maxTokens: 256, // We only need tool decisions, not long text
    temperature: 0.1, // Low temp for consistent tool selection
};

/**
 * Check if Gemini Flash is available
 */
export async function checkFlashHealth(): Promise<boolean> {
    try {
        const client = getFlashClient();
        // Simple test - just try to get model info
        const response = await client.models.generateContent({
            model: flashConfig.model,
            contents: [{ role: 'user', parts: [{ text: 'test' }] }],
            config: {
                maxOutputTokens: 1,
            },
        });
        return !!response;
    } catch (error: any) {
        console.error('🔴 FLASH: Health check failed:', error.message);
        return false;
    }
}

// Re-export useful types from the SDK
export { FunctionCallingConfigMode, Type };
