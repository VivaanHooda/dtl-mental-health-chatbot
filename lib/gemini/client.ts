import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCrisisPromptAddition } from "@/lib/safety/crisis-detection";
import { getCachedEmbedding, saveCachedEmbedding } from "@/lib/cache/embedding-cache";

// Initialize Gemini client
let geminiClient: GoogleGenerativeAI | null = null;

// Rate limiting: Track last request time
let lastEmbeddingRequest = 0;
let lastGenerationRequest = 0;
const EMBEDDING_DELAY_MS = 0; // No delay - single user development
const GENERATION_DELAY_MS = 0; // No delay - single user development

export function getGeminiClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      console.error('🔴 GEMINI: API key not found in environment variables');
      console.error('🔴 GEMINI: Please add GEMINI_API_KEY to your .env.local file');
      throw new Error('GEMINI_API_KEY is not set. Please add it to your .env.local file');
    }
    console.log('🟢 GEMINI: API key found, initializing client');
    geminiClient = new GoogleGenerativeAI(apiKey);
  }
  return geminiClient;
}

// Helper function to wait/throttle requests
async function throttle(lastRequest: number, delayMs: number): Promise<void> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequest;
  
  if (timeSinceLastRequest < delayMs) {
    const waitTime = delayMs - timeSinceLastRequest;
    console.log(`⏳ Rate limiting: Waiting ${waitTime}ms before next request`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
}

// Generate text using Gemini with context
export async function generateWithContext(
  userMessage: string,
  contextChunks: Array<{ text: string; metadata: any }>,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  fitbitData?: any,
  isCrisis: boolean = false,
  memoryContext: string = ''
) {
  // Throttle generation requests
  await throttle(lastGenerationRequest, GENERATION_DELAY_MS);
  lastGenerationRequest = Date.now();

  const genAI = getGeminiClient();
  
  // Use Gemini 2.0 Flash - latest experimental model
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.7,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });

  // Build context from retrieved chunks
  const contextText = contextChunks
    .map((chunk, idx) => `[Context ${idx + 1}]\n${chunk.text}`)
    .join('\n\n');

  // Build conversation history
  const historyText = conversationHistory
    .map(msg => `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}`)
    .join('\n\n');

  // Build Fitbit health data context
  let healthDataText = '';
  if (fitbitData?.connected && fitbitData?.recentData?.length > 0) {
    healthDataText = '\n## Student\'s Health Metrics (Last 7 Days):\n';
    
    // Organize by data type
    const activityData = fitbitData.recentData.filter((d: any) => d.type === 'activity');
    const heartRateData = fitbitData.recentData.filter((d: any) => d.type === 'heartrate');
    const sleepData = fitbitData.recentData.filter((d: any) => d.type === 'sleep');
    
    if (activityData.length > 0) {
      healthDataText += '\n### Activity Levels:\n';
      activityData.forEach((d: any) => {
        healthDataText += `- ${d.date}: ${d.data.steps} steps, ${d.data.activeMinutes} active minutes, ${d.data.calories} calories\n`;
      });
    }
    
    if (heartRateData.length > 0) {
      healthDataText += '\n### Heart Rate:\n';
      heartRateData.forEach((d: any) => {
        healthDataText += `- ${d.date}: Resting HR ${d.data.restingHeartRate} bpm\n`;
      });
    }
    
    if (sleepData.length > 0) {
      healthDataText += '\n### Sleep Patterns:\n';
      sleepData.forEach((d: any) => {
        const hours = Math.floor(d.data.minutesAsleep / 60);
        const minutes = d.data.minutesAsleep % 60;
        healthDataText += `- ${d.date}: ${hours}h ${minutes}m sleep (${d.data.efficiency}% efficiency)\n`;
      });
    }
    
    healthDataText += '\n**Analysis Instructions**: When relevant to the student\'s query, correlate their health metrics with their mental state. For example:\n';
    healthDataText += '- Low sleep + stress query = suggest sleep improvement strategies\n';
    healthDataText += '- Low activity + low mood = recommend gentle exercise\n';
    healthDataText += '- High resting heart rate + anxiety = discuss relaxation techniques\n';
    healthDataText += 'Only mention health data if it\'s directly relevant to their question. Don\'t force correlations.\n';
  }

  // Add crisis detection prompt if needed
  const crisisAddition = isCrisis ? getCrisisPromptAddition() : '';

  // Create the prompt with RAG context + Fitbit data + Memory + crisis mode
  const prompt = `You are a compassionate and knowledgeable mental health companion AI assistant for RVCE (RV College of Engineering) students. Your role is to provide empathetic support, evidence-based guidance, and helpful resources while maintaining appropriate boundaries.

## Your Core Principles:
1. **Empathy First**: Always acknowledge the student's feelings and validate their experiences
2. **Evidence-Based**: Use the reference materials provided to give accurate, helpful guidance
3. **Safety Conscious**: If someone expresses thoughts of self-harm or severe distress, encourage them to seek immediate professional help
4. **Student Context**: Remember you're supporting college students dealing with academic stress, relationships, career anxiety, and personal growth
5. **Boundaries**: You're a supportive companion, not a replacement for licensed therapists or psychiatrists
6. **Holistic Support**: When health data is available, use it to provide personalized insights about mind-body connections
7. **Personalized Memory**: Use past conversation insights to provide continuity and personalized support
${crisisAddition}
## Reference Context:
${contextText ? contextText : 'No specific reference materials available for this query.'}
${healthDataText}
${memoryContext}
${historyText ? `## Previous Conversation:\n${historyText}\n\n` : ''}## Current Student Message:
${userMessage}

## Your Response:
Please provide a thoughtful, supportive response that:
- Addresses the student's concerns with empathy
- Uses relevant information from the reference context when applicable
- Incorporates health metrics insights if relevant and available
- Offers practical coping strategies or resources
- Encourages professional help if the situation warrants it
- Maintains a warm, conversational, and non-judgmental tone

Remember: You're here to support, not diagnose or treat. Be helpful, be kind, be informed.`;

  try {
    console.log('🔵 GEMINI: Generating response...');
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    console.log('🟢 GEMINI: Response generated successfully');
    
    return text;
  } catch (error: any) {
    console.error('🔴 GEMINI: API error:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      details: error.details || error
    });
    
    // Provide more helpful error messages
    if (error.message?.includes('API key')) {
      throw new Error('Invalid or missing Gemini API key. Please check your .env.local file');
    } else if (error.status === 429) {
      throw new Error('Gemini API rate limit exceeded. Please try again in a moment');
    } else if (error.message?.includes('model not found')) {
      throw new Error('Gemini model not found. The model name may be incorrect');
    }
    
    throw new Error(`Failed to generate response: ${error.message}`);
  }
}

// Generate embeddings using Gemini's embedding model with persistent caching and rate limiting
export async function generateEmbedding(text: string): Promise<number[]> {
  // Check persistent cache first (memory + database)
  const cachedEmbedding = await getCachedEmbedding(text);
  if (cachedEmbedding) {
    return cachedEmbedding;
  }

  // Throttle embedding requests (5 seconds = max 12 per minute, safe for free tier)
  await throttle(lastEmbeddingRequest, EMBEDDING_DELAY_MS);
  lastEmbeddingRequest = Date.now();

  const genAI = getGeminiClient();
  
  // Use Gemini's text embedding model
  const model = genAI.getGenerativeModel({ model: "embedding-001" });
  
  try {
    console.log('🔵 Generating new embedding (rate-limited to 12/min for safety)...');
    const result = await model.embedContent(text);
    const embedding = result.embedding;
    
    // embedding-001 produces 768 dimensions, we need to pad to 1024 for Pinecone
    const embeddingArray = Array.isArray(embedding.values) 
      ? embedding.values 
      : Array.from(embedding.values);
    
    const paddedEmbedding = [...embeddingArray, ...Array(1024 - embeddingArray.length).fill(0)];
    const finalEmbedding = paddedEmbedding.slice(0, 1024);
    
    // Save to persistent cache (async, don't block)
    saveCachedEmbedding(text, finalEmbedding).catch(err => 
      console.warn('⚠️ Failed to save embedding to cache:', err)
    );
    
    console.log('✅ Embedding generated and cached');
    return finalEmbedding;
  } catch (error: any) {
    console.error('Gemini embedding error:', error);
    
    // If rate limit error, wait longer and retry once
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('Too Many Requests')) {
      console.log('⚠️ Rate limit hit, waiting 15 seconds before retry...');
      await new Promise(resolve => setTimeout(resolve, 15000));
      
      try {
        console.log('🔄 Retrying embedding generation...');
        const result = await model.embedContent(text);
        const embedding = result.embedding;
        
        const embeddingArray = Array.isArray(embedding.values) 
          ? embedding.values 
          : Array.from(embedding.values);
        
        const paddedEmbedding = [...embeddingArray, ...Array(1024 - embeddingArray.length).fill(0)];
        const finalEmbedding = paddedEmbedding.slice(0, 1024);
        
        // Save retry result to cache too
        saveCachedEmbedding(text, finalEmbedding).catch(err => 
          console.warn('⚠️ Failed to save retry embedding:', err)
        );
        
        console.log('✅ Embedding generated after retry');
        return finalEmbedding;
      } catch (retryError: any) {
        throw new Error(`Failed to generate embedding after retry: ${retryError.message}`);
      }
    }
    
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}