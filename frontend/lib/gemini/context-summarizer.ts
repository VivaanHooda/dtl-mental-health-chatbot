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
const SUMMARIZER_SYSTEM_PROMPT = `You are a context summarizer for a mental health chatbot. Your job is to convert structured context data into a NATURAL CONVERSATIONAL PARAGRAPH.

CRITICAL RULES:
1. OUTPUT ONLY 1-2 SENTENCES IN PARAGRAPH FORM
2. NO structural labels, headers, bullet points, or sections
3. ALWAYS lead with the user's name: "[Name] has..."
4. Include SPECIFIC health metrics ONLY if highly relevant
5. Reference key memories only when relevant to the message
6. Sound warm, personal, and natural - like a real therapist
7. NEVER output any structured data, lists, or formatting markers

GOOD EXAMPLE:
"Sarah has been managing stress around upcoming exams and has been averaging 3,500 steps daily with a resting heart rate of 72 bpm. She mentioned feeling disconnected recently but is focused on scheduling activities that bring her joy."

BAD EXAMPLES:
❌ "## USER DATA: Sarah has..."
❌ "- Name: Sarah\n- Steps: 3500"
❌ "[VITAL SIGNS] Heart Rate: 72bpm"`;

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

    // User profile section - only include username, not email
    if (userProfile?.username) {
        sections.push(`User: ${userProfile.username}`);
    } else if (userName && userName !== 'you') {
        sections.push(`User: ${userName}`);
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
 * Format recent wellness data as natural language (not for raw context)
 * Returns empty string if no data - Flash will create the summary
 */
function formatRecentWellness(wellness: any, userName: string = 'you'): string {
    if (!wellness) {
        return '';
    }

    const details: string[] = [];

    // Collect all details in natural language
    if (wellness.heartRate) {
        const hr = wellness.heartRate;
        details.push(`heart rate averaging ${hr.average} bpm`);
    }

    if (wellness.recentSteps !== null && wellness.recentSteps !== undefined) {
        details.push(`${wellness.recentSteps} steps in the last 30 minutes`);
    }

    if (wellness.hrv) {
        const status = wellness.hrv.rmssd < 30 ? 'elevated stress' : wellness.hrv.rmssd > 50 ? 'relaxed state' : 'moderate state';
        details.push(`HRV indicating ${status}`);
    }

    // Don't format with userName here - let Flash handle it in the summary
    if (details.length === 0) {
        return '';
    }

    return details.join(', ') + '.';
}

/**
 * Extract key points from summary
 */
function extractKeyPoints(summary: string): string[] {
    // Look for bullet points or key phrases
    const bulletPoints = summary.match(/[-•]\s*(.+)/g) || [];
    return bulletPoints.map(b => b.replace(/^[-•]\s*/, '').trim()).slice(0, 5);
}