/**
 * Gemini Flash Context Summarizer
 * 
 * Uses another Gemini 2.5 Flash instance to summarize all tool outputs
 * into a concise paragraph for DeepSeek. This prevents context overload
 * while preserving the most relevant information.
 */

import { getFlashClient, flashConfig } from './flash-client';
import { OrchestratedContext } from './tool-schemas';

/**
 * Summary result from Flash
 */
export interface ContextSummary {
    summary: string;
    keyPoints: string[];
    summaryTimeMs: number;
}

/**
 * System prompt for the summarizer
 */
const SUMMARIZER_SYSTEM_PROMPT = `You are a context summarizer for a mental health chatbot. Create CONCISE, NATURAL paragraph summaries.

RULES:
1. Format as 1-2 flowing sentences (NOT bullet points or structured data)
2. ALWAYS start with: "[userName] has..."
3. Include SPECIFIC health numbers only if relevant to the message
4. Sound natural and conversational
5. Focus ONLY on what's relevant to their current message
6. Never use labels like "CURRENT VITALS" or structured formats

Example output:
"Sarah has been taking around 3,500 steps daily with a resting heart rate of 72 bpm. She mentioned feeling stressed about exams last week."`;

/**
 * Summarize all tool outputs using Gemini Flash
 */
export async function summarizeContext(
    userMessage: string,
    context: OrchestratedContext,
    recentWellness: any | null,
    userName: string = 'Student',
    userProfile?: any
): Promise<ContextSummary> {
    const startTime = Date.now();

    // Build the raw context to summarize
    const rawContext = buildRawContext(context, recentWellness, userProfile, userName);

    // If context is very small, just return it directly
    if (rawContext.length < 300) {
        return {
            summary: rawContext,
            keyPoints: [],
            summaryTimeMs: Date.now() - startTime,
        };
    }

    try {
        const client = getFlashClient();

        const prompt = `User: ${userName}
Message: "${userMessage}"

Context data:
${rawContext}

Create a 1-2 sentence summary. Start with "${userName} has..." and keep it conversational.`;

        const response = await client.models.generateContent({
            model: flashConfig.model,
            contents: [
                { role: 'user', parts: [{ text: SUMMARIZER_SYSTEM_PROMPT }] },
                { role: 'model', parts: [{ text: 'Understood. I will create concise, actionable summaries focused on relevance to the current conversation.' }] },
                { role: 'user', parts: [{ text: prompt }] },
            ],
            config: {
                maxOutputTokens: 512,
                temperature: 0.3,
            },
        });

        const summary = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const duration = Date.now() - startTime;

        // Extract key points from the summary
        const keyPoints = extractKeyPoints(summary);

        return {
            summary,
            keyPoints,
            summaryTimeMs: duration,
        };
    } catch (error: any) {
        // Fallback: return truncated raw context
        return {
            summary: rawContext.substring(0, 2000),
            keyPoints: [],
            summaryTimeMs: Date.now() - startTime,
        };
    }
}

/**
 * Build the raw context string from all tool outputs
 */
function buildRawContext(context: OrchestratedContext, recentWellness: any | null, userProfile?: any, userName: string = 'you'): string {
    const sections: string[] = [];

    // User profile section
    if (userProfile) {
        let profileText = `User Profile: ${userProfile.username || 'User'}`;
        if (userProfile.email) profileText += ` (${userProfile.email})`;
        sections.push(profileText);
    }

    // Memories section
    if (context.memories && context.memories.length > 0) {
        const memoriesText = context.memories
            .map((m, i) => `${i + 1}. [${m.category || 'general'}] ${m.memory}`)
            .join('\n');
        sections.push(`## USER MEMORIES (${context.memories.length} found):\n${memoriesText}`);
    }

    // Fitbit historical data section
    if (context.fitbitData?.recentData && context.fitbitData.recentData.length > 0) {
        const fitbitSummary = summarizeFitbitData(context.fitbitData.recentData);
        sections.push(`## FITBIT HEALTH DATA (Last 7 days):\n${fitbitSummary}`);
    }

    // Recent wellness/intraday data section
    if (recentWellness) {
        const wellnessText = formatRecentWellness(recentWellness, userName);
        sections.push(`## CURRENT WELLNESS (Last 30 minutes):\n${wellnessText}`);
    }

    // Health analysis section
    if (context.healthAnalysis) {
        sections.push(`## AI HEALTH ANALYSIS:\n${context.healthAnalysis}`);
    }

    // RAG knowledge base section
    if (context.ragChunks && context.ragChunks.length > 0) {
        const ragText = context.ragChunks
            .map((chunk, i) => `${i + 1}. ${chunk.text.substring(0, 300)}...`)
            .join('\n\n');
        sections.push(`## KNOWLEDGE BASE (${context.ragChunks.length} relevant chunks):\n${ragText}`);
    }

    return sections.join('\n\n---\n\n');
}

/**
 * Summarize Fitbit data for context with ACTUAL VALUES
 */
function summarizeFitbitData(data: Array<{ date: string; type: string; data: any }>): string {
    const byType: { [key: string]: any[] } = {};

    for (const record of data) {
        if (!byType[record.type]) byType[record.type] = [];
        byType[record.type].push(record);
    }

    const summaries: string[] = [];

    // Sleep data with actual values
    if (byType.sleep && byType.sleep.length > 0) {
        const sleepRecords = byType.sleep.filter(d => d.data?.duration > 0);
        if (sleepRecords.length > 0) {
            const avgSleepMins = sleepRecords.reduce((sum, d) => sum + (d.data.duration || 0), 0) / sleepRecords.length;
            const avgSleepHrs = avgSleepMins / 60;
            const lastSleep = sleepRecords[0];
            summaries.push(`SLEEP(last ${sleepRecords.length} days): Average ${avgSleepHrs.toFixed(1)} hrs / night`);
            if (lastSleep.data.efficiency) {
                summaries.push(`  Last night: ${(lastSleep.data.duration / 60).toFixed(1)} hrs, ${lastSleep.data.efficiency}% efficiency`);
            }
        }
    }

    // Activity data with actual values
    if (byType.activity && byType.activity.length > 0) {
        const activityRecords = byType.activity.filter(d => d.data?.steps > 0);
        if (activityRecords.length > 0) {
            const avgSteps = activityRecords.reduce((sum, d) => sum + (d.data.steps || 0), 0) / activityRecords.length;
            const lastActivity = activityRecords[0];
            summaries.push(`ACTIVITY(last ${activityRecords.length} days): Average ${Math.round(avgSteps).toLocaleString()} steps / day`);
            if (lastActivity.data) {
                summaries.push(`  Today: ${lastActivity.data.steps?.toLocaleString() || 0} steps, ${lastActivity.data.calories?.toLocaleString() || 0} calories`);
            }
        }
    }

    // Heart rate data with actual values
    if (byType.heartrate && byType.heartrate.length > 0) {
        const hrRecords = byType.heartrate.filter(d => d.data?.restingHeartRate > 0);
        if (hrRecords.length > 0) {
            const avgHR = hrRecords.reduce((sum, d) => sum + (d.data.restingHeartRate || 0), 0) / hrRecords.length;
            const lastHR = hrRecords[0];
            summaries.push(`RESTING HEART RATE(last ${hrRecords.length} days): Average ${Math.round(avgHR)} bpm`);
            if (lastHR.data.restingHeartRate) {
                summaries.push(`  Today: ${lastHR.data.restingHeartRate} bpm`);
            }
        }
    }

    return summaries.join('\n') || 'No historical Fitbit data available';
}

/**
 * Format recent wellness data with ALL specific values
 */
function formatRecentWellness(wellness: any, userName: string = 'you'): string {
    if (!wellness) {
        return `${userName} has no recent wellness data available.`;
    }

    const details: string[] = [];

    // Collect all details in natural language
    if (wellness.heartRate) {
        const hr = wellness.heartRate;
        details.push(`a heart rate of ${hr.average} bpm`);
    }

    if (wellness.recentSteps !== null && wellness.recentSteps !== undefined) {
        details.push(`${wellness.recentSteps} steps`);
    }

    if (wellness.hrv) {
        const status = wellness.hrv.rmssd < 30 ? 'stressed' : wellness.hrv.rmssd > 50 ? 'relaxed' : 'neutral';
        details.push(`HRV ${wellness.hrv.rmssd}ms (${status})`);
    }

    // Build the sentence with userName
    if (details.length === 0) {
        return `${userName} has no recent vital data available.`;
    }

    return `${userName} has ${details.join(', ')}.`;
}

/**
 * Extract key points from summary
 */
function extractKeyPoints(summary: string): string[] {
    // Look for bullet points or key phrases
    const bulletPoints = summary.match(/[-•]\s*(.+)/g) || [];
    return bulletPoints.map(b => b.replace(/^[-•]\s*/, '').trim()).slice(0, 5);
}