/**
 * AI-Powered Fitbit Health Analysis
 * 
 * Uses local Ollama model to analyze Fitbit health data and generate 
 * personalized mental health insights. This replaces rule-based analysis
 * with intelligent, context-aware recommendations.
 */

import { generateText, checkOllamaHealth, ollamaConfig } from "@/lib/ollama/client";

interface FitbitDataPoint {
  date: string;
  type: 'activity' | 'heartrate' | 'sleep';
  data: any;
}

interface AIHealthInsight {
  summary: string;
  mentalHealthCorrelation: string;
  recommendations: string[];
  urgencyLevel: 'low' | 'moderate' | 'high';
  patterns: string[];
}

/**
 * Analyze Fitbit data using local Ollama model
 * @param fitbitData - Recent Fitbit data (last 7 days)
 * @param userContext - Additional context (optional: past conversations, concerns)
 * @returns AI-generated health insights
 */
export async function analyzeHealthDataWithAI(
  fitbitData: FitbitDataPoint[],
  userContext?: string
): Promise<AIHealthInsight | null> {
  if (!fitbitData || fitbitData.length === 0) {
    return null;
  }

  try {
    // Check if Ollama is running
    const isHealthy = await checkOllamaHealth();
    if (!isHealthy) {
      console.warn('⚠️ FITBIT AI: Ollama service not available, skipping AI analysis');
      return null;
    }

    // Prepare structured data for analysis
    const dataByType = organizeDataByType(fitbitData);

    const prompt = `You are a specialized AI trained to analyze health data and identify correlations with mental health for college students.

## Health Data (Last 7 Days):

${formatDataForAnalysis(dataByType)}

${userContext ? `## Student Context:\n${userContext}\n` : ''}

## Task:
Analyze this health data and provide insights in JSON format:

{
  "summary": "Brief 2-3 sentence summary of overall health patterns",
  "mentalHealthCorrelation": "How these health metrics may affect mental well-being (anxiety, stress, mood, cognition)",
  "recommendations": ["Specific actionable recommendation 1", "Specific actionable recommendation 2", "Specific actionable recommendation 3"],
  "urgencyLevel": "low|moderate|high",
  "patterns": ["Notable pattern 1", "Notable pattern 2"]
}

## Guidelines:
- Focus on mental health implications (stress, anxiety, depression, cognitive function)
- Be empathetic and supportive in tone
- Provide specific, actionable recommendations
- Consider college student context (exams, social life, sleep schedule)
- Set urgencyLevel based on concerning patterns (e.g., severe sleep deprivation = high)
- Identify trends over the 7-day period

IMPORTANT: Return ONLY valid JSON, no additional text.`;

    const response = await generateText(prompt, {
      temperature: 0.5,
      maxTokens: 1024,
    });

    // Parse JSON response - find the outermost JSON object
    const insights = parseJSONFromResponse(response);
    if (!insights) {
      console.error('FITBIT AI: Failed to parse JSON response');
      return null;
    }

    return insights;
  } catch (error: any) {
    console.error('FITBIT AI: Error analyzing health data:', error.message);
    return null;
  }
}

/**
 * Safely parse JSON from LLM response
 * Handles cases where model outputs extra text before/after JSON
 */
function parseJSONFromResponse(response: string): AIHealthInsight | null {
  try {
    // First try direct parse
    return JSON.parse(response.trim());
  } catch {
    // Find JSON by matching balanced braces
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < response.length; i++) {
      if (response[i] === '{') {
        if (braceCount === 0) startIndex = i;
        braceCount++;
      } else if (response[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i;
          break;
        }
      }
    }

    if (startIndex !== -1 && endIndex !== -1) {
      const jsonStr = response.substring(startIndex, endIndex + 1);
      try {
        return JSON.parse(jsonStr);
      } catch {
        // Try to clean up common issues
        const cleaned = jsonStr
          .replace(/,\s*}/g, '}')  // Remove trailing commas
          .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
          .replace(/[\x00-\x1F\x7F]/g, ' '); // Remove control characters

        try {
          return JSON.parse(cleaned);
        } catch {
          return null;
        }
      }
    }
    return null;
  }
}

/**
 * Organize Fitbit data by type for cleaner analysis
 */
function organizeDataByType(data: FitbitDataPoint[]): {
  sleep: FitbitDataPoint[];
  activity: FitbitDataPoint[];
  heartRate: FitbitDataPoint[];
} {
  return {
    sleep: data.filter(d => d.type === 'sleep'),
    activity: data.filter(d => d.type === 'activity'),
    heartRate: data.filter(d => d.type === 'heartrate'),
  };
}

/**
 * Format data for AI prompt
 */
function formatDataForAnalysis(dataByType: {
  sleep: FitbitDataPoint[];
  activity: FitbitDataPoint[];
  heartRate: FitbitDataPoint[];
}): string {
  let formatted = '';

  // Sleep Data
  if (dataByType.sleep.length > 0) {
    formatted += '### Sleep Patterns:\n';
    dataByType.sleep.forEach(d => {
      const hours = Math.floor((d.data.minutesAsleep || 0) / 60);
      const minutes = (d.data.minutesAsleep || 0) % 60;
      formatted += `- ${d.date}: ${hours}h ${minutes}m sleep, ${d.data.efficiency || 'N/A'}% efficiency`;
      if (d.data.stages) {
        formatted += ` (Deep: ${d.data.stages.deep || 0}m, REM: ${d.data.stages.rem || 0}m, Light: ${d.data.stages.light || 0}m)`;
      }
      formatted += '\n';
    });
    formatted += '\n';
  }

  // Activity Data
  if (dataByType.activity.length > 0) {
    formatted += '### Physical Activity:\n';
    dataByType.activity.forEach(d => {
      formatted += `- ${d.date}: ${d.data.steps || 0} steps, ${d.data.activeMinutes || 0} active mins, ${d.data.calories || 0} cal, ${d.data.distance || 0} km\n`;
    });
    formatted += '\n';
  }

  // Heart Rate Data
  if (dataByType.heartRate.length > 0) {
    formatted += '### Heart Rate:\n';
    dataByType.heartRate.forEach(d => {
      formatted += `- ${d.date}: Resting HR ${d.data.restingHeartRate || 'N/A'} bpm`;
      if (d.data.zones && Array.isArray(d.data.zones)) {
        const cardio = d.data.zones.find((z: any) => z.name === 'Cardio');
        const fatBurn = d.data.zones.find((z: any) => z.name === 'Fat Burn');
        if (cardio || fatBurn) {
          formatted += ` (Cardio: ${cardio?.minutes || 0}m, Fat Burn: ${fatBurn?.minutes || 0}m)`;
        }
      }
      formatted += '\n';
    });
  }

  return formatted || 'No health data available.';
}

/**
 * Format AI insights for memory storage
 */
export function formatAIInsightsForMemory(insights: AIHealthInsight, dateRange: string): string {
  return `[HEALTH ANALYSIS ${dateRange}] ${insights.summary} Mental Health Impact: ${insights.mentalHealthCorrelation} Urgency: ${insights.urgencyLevel.toUpperCase()}.`;
}

/**
 * Format AI insights for display in chat
 */
export function formatAIInsightsForChat(insights: AIHealthInsight): string {
  let formatted = '### 📊 Your Health Analysis\n\n';
  formatted += `${insights.summary}\n\n`;

  if (insights.mentalHealthCorrelation) {
    formatted += `**Mental Health Connection:** ${insights.mentalHealthCorrelation}\n\n`;
  }

  if (insights.recommendations.length > 0) {
    formatted += '**Recommendations:**\n';
    insights.recommendations.forEach((rec, idx) => {
      formatted += `${idx + 1}. ${rec}\n`;
    });
    formatted += '\n';
  }

  if (insights.patterns.length > 0) {
    formatted += '**Patterns Observed:**\n';
    insights.patterns.forEach(pattern => {
      formatted += `- ${pattern}\n`;
    });
  }

  return formatted;
}
