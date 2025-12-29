/**
 * Tool Schemas for Gemini Flash Function Calling
 * 
 * These schemas define the tools that Gemini Flash can call
 * to gather context for the mental health chatbot.
 */

import { Type } from '@google/genai';

/**
 * Tool definitions for Gemini Flash function calling
 */
export const toolSchemas = {
    tools: [
        {
            functionDeclarations: [
                {
                    name: 'searchMemories',
                    description: 'Search for relevant memories about the user from past conversations. Use this when the user refers to past discussions, their personal situation, preferences, or when you need context about their history.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            query: {
                                type: Type.STRING,
                                description: 'Search query to find relevant memories (e.g., "anxiety about exams", "relationship issues", "sleep problems")',
                            },
                            categories: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: 'Optional categories to filter: personal_info, health_insights, conversation, emotional_state, goals, academic',
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'queryRAG',
                    description: 'Search the mental health knowledge base for evidence-based information about psychological concepts, coping strategies, therapeutic techniques, or mental health conditions. Use for professional/educational content.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            query: {
                                type: Type.STRING,
                                description: 'Search query for mental health knowledge (e.g., "CBT techniques for anxiety", "sleep hygiene tips", "exam stress management")',
                            },
                            topK: {
                                type: Type.NUMBER,
                                description: 'Number of results to return (default: 5)',
                            },
                        },
                        required: ['query'],
                    },
                },
                {
                    name: 'getFitbitHealthData',
                    description: 'Retrieve the user\'s recent health metrics from Fitbit (steps, sleep, heart rate). Use when the conversation involves physical health, sleep quality, activity levels, or when health data might be relevant to mental well-being.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            days: {
                                type: Type.NUMBER,
                                description: 'Number of days of data to retrieve (default: 7)',
                            },
                        },
                        required: [],
                    },
                },
                {
                    name: 'analyzeHealthWithAI',
                    description: 'Get AI-powered analysis of the user\'s health data with mental health correlations. Use when you need insights about how their physical health patterns might affect their mental well-being.',
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            userContext: {
                                type: Type.STRING,
                                description: 'Optional context about user\'s current concerns to focus the analysis',
                            },
                        },
                        required: [],
                    },
                },
            ],
        },
    ],
};

/**
 * Tool names enum for type safety
 */
export type ToolName =
    | 'searchMemories'
    | 'getUserProfile'
    | 'queryRAG'
    | 'getFitbitHealthData'
    | 'analyzeHealthWithAI'
    | 'getRecentWellness';

/**
 * Tool call result types
 */
export interface ToolCallRequest {
    name: ToolName;
    args: Record<string, any>;
}

export interface MemoryResult {
    memories: Array<{
        id: string;
        memory: string;
        category?: string;
        score: number;
    }>;
}

export interface RAGResult {
    chunks: Array<{
        text: string;
        metadata: {
            filename: string;
            pageNumber?: number;
        };
        score: number;
    }>;
}

export interface FitbitResult {
    connected: boolean;
    recentData: Array<{
        date: string;
        type: 'activity' | 'heartrate' | 'sleep';
        data: any;
    }>;
}

export interface HealthAnalysisResult {
    summary: string;
    mentalHealthCorrelation: string;
    recommendations: string[];
    urgencyLevel: 'low' | 'moderate' | 'high';
    patterns: string[];
}

export interface OrchestratedContext {
    memories: MemoryResult['memories'];
    ragChunks: RAGResult['chunks'];
    fitbitData: FitbitResult | null;
    healthAnalysis: HealthAnalysisResult | null;
    toolsUsed: ToolName[];
    executionTimeMs: number;
}
