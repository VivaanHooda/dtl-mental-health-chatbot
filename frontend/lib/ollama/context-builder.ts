/**
 * Context Builder for DeepSeek
 * 
 * Formats orchestrated context from Gemini Flash into a structured
 * prompt for DeepSeek to generate the final response.
 * 
 * NEW: Uses Flash-summarized context to prevent context overload
 */

import { OrchestratedContext } from '@/lib/gemini/tool-schemas';
import { SummarizedOrchestratedContext } from '@/lib/gemini/flash-orchestrator';
import { getCrisisPromptAddition } from '@/lib/safety/crisis-detection';

/**
 * Build a formatted context string for DeepSeek
 */
export function buildContextForDeepSeek(
    context: OrchestratedContext,
    options?: {
        isCrisis?: boolean;
        maxMemoryLength?: number;
        maxRAGLength?: number;
        maxHealthLength?: number;
    }
): string {
    const {
        isCrisis = false,
        maxMemoryLength = 800,
        maxRAGLength = 1500,
        maxHealthLength = 600,
    } = options || {};

    const sections: string[] = [];

    // Add crisis context if needed
    if (isCrisis) {
        sections.push(getCrisisPromptAddition());
    }

    // Format memories
    if (context.memories.length > 0) {
        let memoryText = '## What I Remember About This Student:\n';
        memoryText += context.memories
            .map(mem => {
                const category = mem.category ? `[${mem.category.toUpperCase()}]` : '[GENERAL]';
                return `• ${category} ${mem.memory}`;
            })
            .join('\n');

        if (memoryText.length > maxMemoryLength) {
            memoryText = memoryText.substring(0, maxMemoryLength) + '...[truncated]';
        }

        memoryText += '\n\n**Note**: Use these memories to provide personalized support. Reference their name, past concerns, and preferences naturally.';
        sections.push(memoryText);
    }

    // Format RAG chunks
    if (context.ragChunks.length > 0) {
        let ragText = '## Relevant Mental Health Knowledge:\n';
        ragText += context.ragChunks
            .map((chunk, idx) => {
                const source = chunk.metadata.filename
                    ? ` (Source: ${chunk.metadata.filename})`
                    : '';
                return `[Context ${idx + 1}]${source}\n${chunk.text}`;
            })
            .join('\n\n');

        if (ragText.length > maxRAGLength) {
            ragText = ragText.substring(0, maxRAGLength) + '...[more available]';
        }

        sections.push(ragText);
    }

    // Format Fitbit data
    if (context.fitbitData?.recentData && context.fitbitData.recentData.length > 0) {
        let healthText = '## Student\'s Health Metrics (Recent):\n';

        const activityData = context.fitbitData.recentData.filter(d => d.type === 'activity');
        const heartRateData = context.fitbitData.recentData.filter(d => d.type === 'heartrate');
        const sleepData = context.fitbitData.recentData.filter(d => d.type === 'sleep');

        if (activityData.length > 0) {
            healthText += '\n### Activity:\n';
            activityData.slice(0, 5).forEach(d => {
                healthText += `- ${d.date}: ${d.data.steps || 0} steps, ${d.data.activeMinutes || 0} active mins\n`;
            });
        }

        if (heartRateData.length > 0) {
            healthText += '\n### Heart Rate:\n';
            heartRateData.slice(0, 5).forEach(d => {
                healthText += `- ${d.date}: Resting HR ${d.data.restingHeartRate || 'N/A'} bpm\n`;
            });
        }

        if (sleepData.length > 0) {
            healthText += '\n### Sleep:\n';
            sleepData.slice(0, 5).forEach(d => {
                const hours = Math.floor((d.data.minutesAsleep || 0) / 60);
                const minutes = (d.data.minutesAsleep || 0) % 60;
                healthText += `- ${d.date}: ${hours}h ${minutes}m (${d.data.efficiency || 'N/A'}% efficiency)\n`;
            });
        }

        if (healthText.length > maxHealthLength) {
            healthText = healthText.substring(0, maxHealthLength) + '...[truncated]';
        }

        sections.push(healthText);
    }

    // Format AI health analysis
    if (context.healthAnalysis) {
        let analysisText = '## 🤖 AI Health Analysis:\n';
        analysisText += `**Summary:** ${context.healthAnalysis.summary}\n`;
        analysisText += `**Mental Health Impact:** ${context.healthAnalysis.mentalHealthCorrelation}\n`;
        analysisText += `**Urgency Level:** ${context.healthAnalysis.urgencyLevel.toUpperCase()}\n`;

        if (context.healthAnalysis.patterns.length > 0) {
            analysisText += `**Patterns:** ${context.healthAnalysis.patterns.join(', ')}\n`;
        }

        if (context.healthAnalysis.recommendations.length > 0) {
            analysisText += `**Recommendations:** ${context.healthAnalysis.recommendations.join(' | ')}\n`;
        }

        sections.push(analysisText);
    }

    return sections.join('\n\n');
}

/**
 * Build the complete system prompt for DeepSeek
 * Uses the Flash-summarized context instead of raw data
 */
export function buildDeepSeekPrompt(
    userMessage: string,
    context: SummarizedOrchestratedContext | OrchestratedContext,
    conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    options?: {
        isCrisis?: boolean;
        userName?: string;
    }
): string {
    console.log('\n[CONTEXT BUILDER]');
    console.log('Tools called:', context.toolsUsed.join(', ') || 'None');

    const userName = options?.userName || 'Student';

    // Check if we have summarized context
    const hasSummarizedContext = 'summarizedContext' in context && context.summarizedContext;
    const summarizedContext = hasSummarizedContext ? (context as SummarizedOrchestratedContext) : null;

    // ALWAYS use summarized context if available (prevents timeout)
    let contextText = '';
    if (summarizedContext?.summarizedContext) {
        contextText = summarizedContext.summarizedContext;
    } else {
        // Fallback: mini summary
        contextText = `User has ${context.memories.length} memories.`;
        if (context.fitbitData) contextText += ' Health data available.';
    }

    // Add crisis context
    if (options?.isCrisis) {
        contextText = 'CRISIS SITUATION. ' + contextText;
    }

    // Build conversation history (last 4 messages only)
    const recentHistory = conversationHistory.slice(-4);
    const historyText = recentHistory.length > 0
        ? recentHistory
            .map(msg => `${msg.role === 'user' ? userName : 'You'}: ${msg.content}`)
            .join('\n')
        : '';

    // Ultra-concise prompt
    return `You are a warm mental health companion talking to ${userName}.

## Context:
${contextText}

${historyText ? `## Recent Chat:\n${historyText}\n` : ''}## ${userName}'s Message:
${userMessage}

## Response:
Be warm, supportive, concise (under 100 words). Reference health data with specific values when relevant.`;
}

/**
 * Get a summary of what context was gathered
 */
export function getContextSummary(context: SummarizedOrchestratedContext | OrchestratedContext): string {
    const parts: string[] = [];

    if (context.memories.length > 0) {
        parts.push(`${context.memories.length} memories`);
    }
    if (context.ragChunks.length > 0) {
        parts.push(`${context.ragChunks.length} RAG chunks`);
    }
    if (context.fitbitData?.connected) {
        parts.push('Fitbit history');
    }

    // Check for summarized context fields
    if ('recentWellness' in context && context.recentWellness) {
        const stress = context.recentWellness.mentalHealthIndicators?.stressLevel;
        parts.push(`Wellness (stress: ${stress})`);
    }

    if (context.healthAnalysis) {
        parts.push('health analysis');
    }

    if ('summarizedContext' in context && context.summarizedContext) {
        parts.push(`summarized (${context.summarizedContext.length} chars)`);
    }

    if (parts.length === 0) {
        return 'No additional context gathered';
    }

    const totalTime = context.executionTimeMs +
        (('summarizationTimeMs' in context) ? context.summarizationTimeMs : 0);

    return `Context: ${parts.join(', ')} (${totalTime}ms total)`;
}
