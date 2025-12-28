import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCrisisPromptAddition } from "@/lib/safety/crisis-detection";

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
  userMemories?: Array<{ id: string; memory: string; category?: string; score: number }>,
  aiHealthInsights?: any // AI-generated health analysis from fine-tuned model
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
      topP: 0.9,
      topK: 40,
      maxOutputTokens: 2048,
    },
  });

  // Build context from retrieved chunks
  const contextText = contextChunks
    .map((chunk, idx) => `[Context ${idx + 1}]\n${chunk.text}`)
    .join('\n\n');

  // Build conversation history (last 6 messages for better context)
  const recentHistory = conversationHistory.slice(-6);
  const historyText = recentHistory.length > 0
    ? recentHistory.map(msg => `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}`).join('\n\n')
    : '';

  // Build user memory context from Mem0
  let memoryContext = '';
  if (userMemories && userMemories.length > 0) {
    memoryContext = '\n## Personalized Context (What I Remember About This Student):\n';
    memoryContext += userMemories
      .map((mem, idx) => {
        const categoryLabel = mem.category ? `[${mem.category}]` : '';
        return `${idx + 1}. ${categoryLabel} ${mem.memory}`;
      })
      .join('\n');
    memoryContext += '\n\n**Important**: Use these memories to provide personalized, contextually-aware support. Reference past conversations, patterns, and preferences naturally.\n';
  }

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

  // Add AI-powered health analysis if available
  if (aiHealthInsights) {
    healthDataText += '\n### 🤖 AI Health Analysis:\n';
    healthDataText += `**Summary:** ${aiHealthInsights.summary}\n`;
    healthDataText += `**Mental Health Impact:** ${aiHealthInsights.mentalHealthCorrelation}\n`;
    healthDataText += `**Urgency Level:** ${aiHealthInsights.urgencyLevel.toUpperCase()}\n`;
    
    if (aiHealthInsights.patterns && aiHealthInsights.patterns.length > 0) {
      healthDataText += `**Patterns Detected:** ${aiHealthInsights.patterns.join(', ')}\n`;
    }
    
    if (aiHealthInsights.recommendations && aiHealthInsights.recommendations.length > 0) {
      healthDataText += `**AI Recommendations:** ${aiHealthInsights.recommendations.join(' | ')}\n`;
    }
    
    healthDataText += '\n**Important**: This analysis was generated by a specialized AI model. Use these insights to provide personalized, evidence-based support.\n';
  }

  // Add crisis detection prompt if needed
  const crisisAddition = isCrisis ? getCrisisPromptAddition() : '';

  // Smart context truncation - keep most relevant parts
  const maxContextLength = 2000; // Increased from 500
  const maxHealthLength = 800;   // Increased from 300
  const maxHistoryLength = 600;  // Keep more history
  
  const truncatedContext = contextText.length > maxContextLength 
    ? contextText.substring(0, maxContextLength) + '...[more available]' 
    : contextText;
  
  const truncatedHealth = healthDataText.length > maxHealthLength
    ? healthDataText.substring(0, maxHealthLength) + '...[summary truncated]'
    : healthDataText;
  
  const truncatedHistory = historyText.length > maxHistoryLength
    ? historyText.substring(historyText.length - maxHistoryLength)
    : historyText;

  // Create the prompt - optimized for speed and concise responses
  const prompt = `You are a supportive mental health companion for college students. Be warm, empathetic, and concise.
${crisisAddition}
${memoryContext ? `\n**What I remember about you:**\n${memoryContext}\n` : ''}
${truncatedContext ? `\n**Relevant guidance from mental health resources:**\n${truncatedContext}\n` : ''}
${truncatedHealth ? `\n**Health context:**\n${truncatedHealth}\n` : ''}
${truncatedHistory ? `\n**Recent chat:**\n${truncatedHistory}\n` : ''}
**Student asks:** ${userMessage}

**Instructions:**
1. Keep response under 150 words
2. Use short paragraphs (2-3 lines max)
3. Use **bold** for key points only
4. Use bullet lists (•) for tips
5. Be conversational and warm
6. Reference their name/past if relevant
7. Only suggest professional help if truly needed
8. **IMPORTANT**: If relevant guidance is provided above, use it to inform your response

Respond naturally and concisely:`;

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

// Generate embeddings using Gemini's embedding model with rate limiting
export async function generateEmbedding(text: string): Promise<number[]> {
  // Throttle embedding requests (5 seconds = max 12 per minute, safe for free tier)
  await throttle(lastEmbeddingRequest, EMBEDDING_DELAY_MS);
  lastEmbeddingRequest = Date.now();

  const genAI = getGeminiClient();
  
  // Use text-embedding-004 - MUST match the model used for storing documents
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  
  try {
    console.log('🔵 Generating embedding with text-embedding-004...');
    const result = await model.embedContent(text);
    const embedding = result.embedding;
    
    // text-embedding-004 produces 768 dimensions
    const embeddingArray = Array.isArray(embedding.values) 
      ? embedding.values 
      : Array.from(embedding.values);
    
    console.log('✅ Embedding generated (768 dimensions)');
    return embeddingArray;
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
        
        console.log('✅ Embedding generated after retry (768 dimensions)');
        return embeddingArray;
      } catch (retryError: any) {
        throw new Error(`Failed to generate embedding after retry: ${retryError.message}`);
      }
    }
    
    throw new Error(`Failed to generate embedding: ${error.message}`);
  }
}