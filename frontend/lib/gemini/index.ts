/**
 * Gemini Flash Module
 * 
 * Two-stage architecture for the mental health chatbot:
 * 
 * 1. **Gemini Flash (Tool Orchestration)**
 *    - Fast, lightweight model for intelligent tool selection
 *    - Decides which tools to call based on user message
 *    - Executes selected tools in parallel for low latency
 * 
 * 2. **DeepSeek/Ollama (Response Generation)**
 *    - Local model for high-quality mental health responses
 *    - Receives formatted context from Flash orchestration
 *    - Generates personalized, empathetic responses
 * 
 * Setup:
 * 1. Get free API key from https://aistudio.google.com/apikey
 * 2. Add GEMINI_API_KEY to your .env file
 * 3. Ensure Ollama is running with med-assistant model
 * 
 * @module lib/gemini
 */

export { getFlashClient, checkFlashHealth, flashConfig } from './flash-client';
export { orchestrateContext, orchestrateWithTimeout } from './flash-orchestrator';
export { toolSchemas, type ToolName, type OrchestratedContext } from './tool-schemas';

// Re-export legacy client for backward compatibility
export { generateWithContext, generateEmbedding, checkLLMHealth } from './client';
