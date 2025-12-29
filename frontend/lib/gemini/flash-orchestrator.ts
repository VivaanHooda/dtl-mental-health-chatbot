/**
 * Gemini Flash Orchestrator
 * 
 * Uses Gemini Flash for intelligent tool selection and parallel execution.
 * This is the core of the two-stage architecture:
 * 1. Flash decides which tools to call based on user message
 * 2. Selected tools execute in parallel
 * 3. Another Flash instance summarizes all tool outputs
 * 4. Summary is passed to DeepSeek for response generation
 */

import { getFlashClient, flashConfig, FunctionCallingConfigMode } from './flash-client';
import { toolSchemas, ToolName, ToolCallRequest, OrchestratedContext } from './tool-schemas';
import { searchMemories, MEMORY_CATEGORIES } from '@/lib/mem0/client';
import { queryRAG } from '@/lib/rag/query';
import { analyzeHealthDataWithAI } from '@/lib/fitbit/ai-analyzer';
import { createClient } from '@/lib/supabase/server';
import { fetchIntradayHeartRate, fetchHRV, fetchBreathingRate, fetchSpO2, fetchIntradayActivity } from '@/lib/fitbit/intraday-api';
import { summarizeContext, ContextSummary } from './context-summarizer';

/**
 * Extended context that includes the summarized version
 */
export interface SummarizedOrchestratedContext extends OrchestratedContext {
    recentWellness: RecentWellnessData | null;
    summarizedContext: string;
    keyPoints: string[];
    summarizationTimeMs: number;
}

/**
 * Recent wellness data from intraday API
 */
export interface RecentWellnessData {
    timestamp: string;
    heartRate: { average: number; min: number; max: number } | null;
    hrv: { rmssd: number; coverage: number } | null;
    breathingRate: number | null;
    spo2: number | null;
    recentSteps: number | null;
    mentalHealthIndicators: {
        stressLevel: 'low' | 'moderate' | 'high' | 'unknown';
        anxietyRisk: 'low' | 'moderate' | 'elevated' | 'unknown';
        fatigueLevel: 'low' | 'moderate' | 'high' | 'unknown';
    };
}

/**
 * System prompt for Flash to understand its role
 * NOTE: Flash only decides if RAG is needed. Memories and Fitbit always run in parallel.
 */
const ORCHESTRATOR_SYSTEM_PROMPT = `You are an intelligent context orchestrator for a mental health chatbot. Your ONLY job is to decide if the RAG (knowledge base) tool should be called.

NOTE: User memories and Fitbit health data are ALWAYS fetched automatically. You only need to decide about RAG.

Call queryRAG ONLY when:
1. User asks about mental health concepts, conditions, or techniques (CBT, anxiety disorders, depression, etc.)
2. User needs evidence-based coping strategies or therapeutic techniques
3. User asks educational questions about psychology or mental health
4. User needs professional guidance on specific mental health topics

DO NOT call queryRAG for:
1. Personal conversations about their day, feelings, or experiences
2. Greetings or casual chat
3. Questions about their own health data or past conversations
4. General emotional support without need for educational content

Examples:
- "Tell me about CBT" → queryRAG (educational)
- "What are some techniques for exam anxiety?" → queryRAG (coping strategies)
- "I'm feeling sad today" → NO tools (personal, memories/fitbit auto-fetched)
- "How did I sleep?" → NO tools (health data auto-fetched)
- "Hi, how are you?" → NO tools`;

/**
 * Main orchestration function
 * NEW STRATEGY: 
 * 1. Always fetch memories + Fitbit historical + Fitbit recent wellness in parallel
 * 2. Use Flash to decide on RAG
 * 3. Use another Flash instance to summarize ALL tool outputs
 */
export async function orchestrateContext(
    userId: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    userName: string = 'Student',
    userProfile?: any
): Promise<SummarizedOrchestratedContext> {
    const startTime = Date.now();

    console.log('\n🔵━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 ORCHESTRATOR: Starting context orchestration');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📝 User message:', userMessage.substring(0, 100));

    const context: SummarizedOrchestratedContext = {
        memories: [],
        ragChunks: [],
        fitbitData: null,
        healthAnalysis: null,
        recentWellness: null,
        toolsUsed: [],
        executionTimeMs: 0,
        summarizedContext: '',
        keyPoints: [],
        summarizationTimeMs: 0,
    };

    try {
        // ============================================================
        // PHASE 1: Parallel tool execution
        // ============================================================
        const [memoriesResult, fitbitResult, recentWellnessResult, userProfileResult, ragDecision] = await Promise.allSettled([
            // Always fetch memories
            executeSearchMemories(userId, { query: userMessage }),
            // Always fetch Fitbit historical data
            executeFitbitFetch(userId, { days: 7 }),
            // Always fetch recent wellness (NEW - intraday data)
            executeRecentWellnessFetch(userId),
            // Always fetch user profile (NEW)
            executeGetUserProfile(userId),
            // Ask Flash if RAG is needed (fast decision)
            shouldCallRAG(userMessage, conversationHistory),
        ]);

        // Process memories result
        if (memoriesResult.status === 'fulfilled' && memoriesResult.value) {
            context.memories = memoriesResult.value;
            context.toolsUsed.push('searchMemories');
        }

        // Process Fitbit historical result
        if (fitbitResult.status === 'fulfilled' && fitbitResult.value) {
            context.fitbitData = fitbitResult.value;
            context.toolsUsed.push('getFitbitHealthData');
        }

        // Process recent wellness result (NEW)
        if (recentWellnessResult.status === 'fulfilled' && recentWellnessResult.value) {
            context.recentWellness = recentWellnessResult.value;
            context.toolsUsed.push('getRecentWellness');
        }

        // Process user profile result (NEW) - merge with passed userProfile if available
        let finalUserProfile = userProfile;
        if (userProfileResult.status === 'fulfilled' && userProfileResult.value) {
            finalUserProfile = userProfileResult.value;
            context.toolsUsed.push('getUserProfile');
        }
        userProfile = finalUserProfile;

        // If Flash decided RAG is needed, fetch it now
        const needsRAG = ragDecision.status === 'fulfilled' && ragDecision.value;
        if (needsRAG) {
            try {
                const ragResult = await executeQueryRAG({ query: userMessage, topK: 5 });
                if (ragResult) {
                    context.ragChunks = ragResult;
                    context.toolsUsed.push('queryRAG');
                }
            } catch (ragError: any) {
                // Silently fail
            }
        }

        // Run health analysis if we have Fitbit data
        if (context.fitbitData?.recentData && context.fitbitData.recentData.length > 0) {
            try {
                const healthAnalysis = await analyzeHealthDataWithAI(context.fitbitData.recentData);
                if (healthAnalysis) {
                    context.healthAnalysis = healthAnalysis;
                    context.toolsUsed.push('analyzeHealthWithAI');
                }
            } catch (healthError: any) {
                // Silently fail
            }
        }

        context.executionTimeMs = Date.now() - startTime;

        // ============================================================
        // PHASE 2: Summarize all context with Flash
        // ============================================================
        const summaryResult = await summarizeContext(
            userMessage,
            context,
            context.recentWellness,
            userName,
            userProfile
        );

        context.summarizedContext = summaryResult.summary;
        context.keyPoints = summaryResult.keyPoints;
        context.summarizationTimeMs = summaryResult.summaryTimeMs;

        console.log('\n[FLASH SUMMARY]');
        console.log(context.summarizedContext);
        console.log('');

        return context;

    } catch (error: any) {
        console.error('🔴 ORCHESTRATOR: Error during orchestration:', error.message);
        context.executionTimeMs = Date.now() - startTime;
        return context;
    }
}

/**
 * Ask Gemini Flash if RAG (knowledge base) should be queried
 * Returns true if educational/professional mental health content is needed
 */
async function shouldCallRAG(
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<boolean> {
    try {
        const client = getFlashClient();

        // Build conversation context (last 2 messages for context)
        const recentHistory = conversationHistory.slice(-2);
        const historyText = recentHistory.length > 0
            ? recentHistory.map(m => `${m.role}: ${m.content}`).join('\n')
            : '';

        const prompt = historyText
            ? `Recent conversation:\n${historyText}\n\nCurrent message: ${userMessage}`
            : userMessage;

        // Simplified tool schema - only RAG
        const ragOnlySchema = {
            tools: [{
                functionDeclarations: [{
                    name: 'queryRAG',
                    description: 'Search the mental health knowledge base for evidence-based information. Only call this for educational content about psychology, mental health conditions, coping strategies, or therapeutic techniques.',
                    parameters: {
                        type: 'OBJECT' as const,
                        properties: {
                            query: { type: 'STRING' as const, description: 'Search query' },
                        },
                        required: ['query'],
                    },
                }],
            }],
        };

        console.log('🔧 Tool Available: queryRAG');

        const requestStart = Date.now();
        const response = await client.models.generateContent({
            model: flashConfig.model,
            contents: [
                { role: 'user', parts: [{ text: ORCHESTRATOR_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'I understand. I will only call queryRAG when educational mental health content is needed.' }] },
                { role: 'user', parts: [{ text: prompt }] },
            ],
            config: {
                maxOutputTokens: 64,
                temperature: 0.1,
            },
            ...ragOnlySchema,
        });
        const duration = Date.now() - requestStart;

        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖 FLASH OUTPUT (RAG Decision):');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('⏱️  Response Time:', duration + 'ms');
        console.log('📊 Candidates:', response.candidates?.length || 0);

        // Check if Flash called the RAG tool
        let toolCalled = false;
        let toolArgs = null;

        if (response.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.functionCall?.name === 'queryRAG') {
                    toolCalled = true;
                    toolArgs = part.functionCall.args;
                    console.log('✅ Tool Called: queryRAG');
                    console.log('📦 Arguments:', JSON.stringify(toolArgs, null, 2));
                }
                if (part.text) {
                    console.log('💭 Flash Reasoning:', part.text);
                }
            }
        }

        if (!toolCalled) {
            console.log('❌ No Tool Called - RAG not needed');
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        return toolCalled;

    } catch (error: any) {
        console.error('🔴 ORCHESTRATOR: Flash RAG decision failed:', error.message);
        // On error, default to NOT calling RAG (memories + Fitbit still work)
        return false;
    }
}

/**
 * Execute searchMemories tool
 */
async function executeSearchMemories(
    userId: string,
    args: { query: string; categories?: string[] }
): Promise<OrchestratedContext['memories'] | null> {
    try {
        const result = await searchMemories(userId, args.query, {
            categories: args.categories as any,
            limit: 5,
            threshold: 0.3,
        });

        if (result.success && result.memories) {
            return result.memories;
        }
        return null;
    } catch (error: any) {
        return null;
    }
}

/**
 * Execute getUserProfile tool
 */
async function executeGetUserProfile(userId: string): Promise<any | null> {
    try {
        console.log('🔵 TOOL: Executing getUserProfile...');
        const supabase = await createClient();

        const { data: profile, error } = await supabase
            .from('user_profiles')
            .select('username, email')
            .eq('user_id', userId)
            .single();

        if (error) {
            console.warn('⚪ TOOL: getUserProfile failed:', error.message);
            return null;
        }

        if (profile) {
            console.log('✅ TOOL: Got user profile:', profile.username);
            return profile;
        }
        return null;
    } catch (error: any) {
        console.warn('⚪ TOOL: getUserProfile error:', error.message);
        return null;
    }
}

/**
 * Execute queryRAG tool
 */
async function executeQueryRAG(
    args: { query: string; topK?: number }
): Promise<OrchestratedContext['ragChunks'] | null> {
    try {
        const chunks = await queryRAG(args.query, args.topK || 5);
        return chunks;
    } catch (error: any) {
        return null;
    }
}

/**
 * Execute Fitbit data fetch
 */
async function executeFitbitFetch(
    userId: string,
    args: { days?: number }
): Promise<OrchestratedContext['fitbitData'] | null> {
    try {
        console.log('🔵 TOOL: Executing getFitbitHealthData...');
        const supabase = await createClient();

        // Check if user has Fitbit connected
        const { data: fitbitTokens } = await supabase
            .from('fitbit_tokens')
            .select('fitbit_user_id')
            .eq('user_id', userId)
            .single();

        if (!fitbitTokens) {
            console.log('⚪ TOOL: User has no Fitbit connected');
            return null;
        }

        // Get recent data
        const days = args.days || 7;
        const { data: recentData } = await supabase
            .from('fitbit_data')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(days * 3); // 3 data types per day

        if (!recentData || recentData.length === 0) {
            console.log('⚪ TOOL: No Fitbit data available');
            return null;
        }

        console.log('🟢 TOOL: getFitbitHealthData returned', recentData.length, 'records');
        return {
            connected: true,
            recentData: recentData.map(d => ({
                date: d.date,
                type: d.data_type as 'activity' | 'heartrate' | 'sleep',
                data: d.data,
            })),
        };
    } catch (error: any) {
        console.warn('⚠️ TOOL: getFitbitHealthData failed:', error.message);
        return null;
    }
}

/**
 * Orchestrate with timeout and fallback
 */
export async function orchestrateWithTimeout(
    userId: string,
    userMessage: string,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    userName: string = 'Student',
    timeoutMs: number = 8000,
    userProfile?: any
): Promise<SummarizedOrchestratedContext> {
    const timeoutPromise = new Promise<SummarizedOrchestratedContext>((_, reject) =>
        setTimeout(() => reject(new Error('Orchestration timeout')), timeoutMs)
    );

    try {
        return await Promise.race([
            orchestrateContext(userId, userMessage, conversationHistory, userName, userProfile),
            timeoutPromise,
        ]);
    } catch (error: any) {
        console.warn('⚠️ ORCHESTRATOR: Timeout or error, returning empty context');
        return {
            memories: [],
            ragChunks: [],
            fitbitData: null,
            healthAnalysis: null,
            recentWellness: null,
            toolsUsed: [],
            executionTimeMs: timeoutMs,
            summarizedContext: '',
            keyPoints: [],
            summarizationTimeMs: 0,
        };
    }
}

/**
 * Execute recent wellness fetch (intraday data)
 * Fetches last 30 minutes of heart rate, HRV, breathing, SpO2
 */
async function executeRecentWellnessFetch(userId: string): Promise<RecentWellnessData | null> {
    try {
        console.log('🔵 TOOL: Fetching recent wellness data (intraday)...');

        const supabase = await createClient();

        // Check if user has Fitbit connected
        const { data: fitbitTokens } = await supabase
            .from('fitbit_tokens')
            .select('fitbit_user_id')
            .eq('user_id', userId)
            .single();

        if (!fitbitTokens) {
            console.log('⚪ TOOL: User has no Fitbit connected');
            return null;
        }

        // Get time range for last 30 minutes
        const now = new Date();
        const thirtyMinAgo = new Date(now.getTime() - 30 * 60 * 1000);
        const startTime = thirtyMinAgo.toTimeString().slice(0, 5); // HH:MM
        const endTime = now.toTimeString().slice(0, 5);
        const today = now.toISOString().split('T')[0];

        // Fetch all metrics in parallel
        const [heartRateResult, hrvResult, breathingResult, spo2Result, stepsResult] = await Promise.allSettled([
            fetchIntradayHeartRate(userId, today, '1min', startTime, endTime),
            fetchHRV(userId, today),
            fetchBreathingRate(userId, today),
            fetchSpO2(userId, today),
            fetchIntradayActivity(userId, 'steps', today, '15min', startTime, endTime),
        ]);

        // Process heart rate
        let heartRate: { average: number; min: number; max: number } | null = null;
        if (heartRateResult.status === 'fulfilled' && heartRateResult.value) {
            const hrData = heartRateResult.value['activities-heart-intraday']?.dataset || [];
            if (hrData.length > 0) {
                const values = hrData.map((d: any) => d.value);
                heartRate = {
                    average: Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length),
                    min: Math.min(...values),
                    max: Math.max(...values),
                };
            }
        }

        // Process HRV
        let hrv = null;
        if (hrvResult.status === 'fulfilled' && hrvResult.value?.hrv?.[0]?.value) {
            hrv = {
                rmssd: hrvResult.value.hrv[0].value.dailyRmssd || hrvResult.value.hrv[0].value.rmssd,
                coverage: hrvResult.value.hrv[0].value.coverage || 0,
            };
        }

        // Process breathing rate
        let breathingRate = null;
        if (breathingResult.status === 'fulfilled' && breathingResult.value?.br?.[0]?.value) {
            breathingRate = breathingResult.value.br[0].value.breathingRate;
        }

        // Process SpO2
        let spo2 = null;
        if (spo2Result.status === 'fulfilled' && spo2Result.value) {
            spo2 = spo2Result.value.value?.avg || spo2Result.value.value?.max;
        }

        // Process recent steps
        let recentSteps = null;
        if (stepsResult.status === 'fulfilled' && stepsResult.value) {
            const stepsData = stepsResult.value['activities-steps-intraday']?.dataset || [];
            recentSteps = stepsData.reduce((sum: number, d: any) => sum + (d.value || 0), 0);
        }

        // Calculate mental health indicators
        const mentalHealthIndicators = calculateMentalHealthIndicators(heartRate, hrv, breathingRate);

        const wellness: RecentWellnessData = {
            timestamp: now.toISOString(),
            heartRate,
            hrv,
            breathingRate,
            spo2,
            recentSteps,
            mentalHealthIndicators,
        };

        console.log('🟢 TOOL: Recent wellness fetched:', {
            hasHeartRate: !!heartRate,
            hasHRV: !!hrv,
            stress: mentalHealthIndicators.stressLevel,
        });

        return wellness;

    } catch (error: any) {
        console.warn('⚠️ TOOL: Recent wellness fetch failed:', error.message);
        return null;
    }
}

/**
 * Calculate mental health indicators from physiological data
 */
function calculateMentalHealthIndicators(
    heartRate: { average: number; min: number; max: number } | null,
    hrv: { rmssd: number; coverage?: number } | null,
    breathingRate: number | null
): RecentWellnessData['mentalHealthIndicators'] {
    const indicators: RecentWellnessData['mentalHealthIndicators'] = {
        stressLevel: 'unknown',
        anxietyRisk: 'unknown',
        fatigueLevel: 'unknown',
    };

    // Stress Level: Based on HRV (primary) and resting HR (secondary)
    // Low HRV + High HR = High Stress
    if (hrv && heartRate) {
        if (hrv.rmssd < 20 && heartRate.average > 80) {
            indicators.stressLevel = 'high';
        } else if (hrv.rmssd < 40 || heartRate.average > 75) {
            indicators.stressLevel = 'moderate';
        } else {
            indicators.stressLevel = 'low';
        }
    } else if (heartRate) {
        indicators.stressLevel = heartRate.average > 80 ? 'moderate' : 'low';
    }

    // Anxiety Risk: Based on HR variability and breathing
    // High HR + Elevated breathing = Anxiety indicators
    if (heartRate && breathingRate) {
        if (heartRate.average > 85 && breathingRate > 18) {
            indicators.anxietyRisk = 'elevated';
        } else if (heartRate.average > 75 || breathingRate > 16) {
            indicators.anxietyRisk = 'moderate';
        } else {
            indicators.anxietyRisk = 'low';
        }
    } else if (heartRate) {
        indicators.anxietyRisk = heartRate.average > 85 ? 'moderate' : 'low';
    }

    // Fatigue: Based on HRV recovery patterns
    if (hrv) {
        if (hrv.rmssd < 25) {
            indicators.fatigueLevel = 'high';
        } else if (hrv.rmssd < 45) {
            indicators.fatigueLevel = 'moderate';
        } else {
            indicators.fatigueLevel = 'low';
        }
    }

    return indicators;
}
