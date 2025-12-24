/**
 * Fitbit Health Insight Generator
 * 
 * Analyzes Fitbit health data and generates concise insights for memory storage.
 * These insights help the AI understand health patterns and correlate them with mental health.
 */

interface FitbitDataPoint {
  date: string;
  type: 'activity' | 'heartrate' | 'sleep';
  data: any;
}

interface HealthInsight {
  category: 'sleep' | 'activity' | 'stress' | 'overall';
  insight: string;
  severity?: 'good' | 'concern' | 'alert';
  dateRange: string;
}

/**
 * Generate concise health insights from Fitbit data
 * @param fitbitData - Recent Fitbit data (last 7 days)
 * @returns Array of health insights suitable for memory storage
 */
export function generateHealthInsights(fitbitData: FitbitDataPoint[]): HealthInsight[] {
  if (!fitbitData || fitbitData.length === 0) {
    return [];
  }

  const insights: HealthInsight[] = [];
  const dateRange = `${fitbitData[fitbitData.length - 1]?.date} to ${fitbitData[0]?.date}`;

  // Analyze sleep patterns
  const sleepData = fitbitData.filter(d => d.type === 'sleep');
  if (sleepData.length > 0) {
    const avgSleep = sleepData.reduce((sum, d) => sum + (d.data.minutesAsleep || 0), 0) / sleepData.length;
    const avgEfficiency = sleepData.reduce((sum, d) => sum + (d.data.efficiency || 0), 0) / sleepData.length;
    
    const hours = Math.floor(avgSleep / 60);
    const minutes = Math.round(avgSleep % 60);
    
    let severity: 'good' | 'concern' | 'alert' = 'good';
    let sleepInsight = '';
    
    if (avgSleep < 360) { // Less than 6 hours
      severity = 'alert';
      sleepInsight = `Sleep deprivation detected: averaging only ${hours}h ${minutes}m per night (recommended: 7-9 hours). Poor sleep strongly correlates with anxiety, depression, and cognitive impairment.`;
    } else if (avgSleep < 420) { // Less than 7 hours
      severity = 'concern';
      sleepInsight = `Suboptimal sleep: averaging ${hours}h ${minutes}m per night. Consider improving sleep hygiene for better mental health.`;
    } else if (avgSleep > 540) { // More than 9 hours
      severity = 'concern';
      sleepInsight = `Excessive sleep detected: averaging ${hours}h ${minutes}m per night. Could indicate depression or low energy levels.`;
    } else {
      sleepInsight = `Good sleep pattern: averaging ${hours}h ${minutes}m per night with ${Math.round(avgEfficiency)}% efficiency.`;
    }
    
    insights.push({
      category: 'sleep',
      insight: sleepInsight,
      severity,
      dateRange,
    });
  }

  // Analyze activity levels
  const activityData = fitbitData.filter(d => d.type === 'activity');
  if (activityData.length > 0) {
    const avgSteps = activityData.reduce((sum, d) => sum + (d.data.steps || 0), 0) / activityData.length;
    const avgActiveMinutes = activityData.reduce((sum, d) => sum + (d.data.activeMinutes || 0), 0) / activityData.length;
    
    let severity: 'good' | 'concern' | 'alert' = 'good';
    let activityInsight = '';
    
    if (avgSteps < 3000) {
      severity = 'alert';
      activityInsight = `Very low physical activity: averaging only ${Math.round(avgSteps)} steps/day. Sedentary lifestyle increases depression and anxiety risk. Recommend gentle exercise.`;
    } else if (avgSteps < 5000) {
      severity = 'concern';
      activityInsight = `Low activity levels: averaging ${Math.round(avgSteps)} steps/day. Regular movement helps improve mood and reduce stress.`;
    } else if (avgSteps > 10000) {
      activityInsight = `Excellent activity levels: averaging ${Math.round(avgSteps)} steps/day with ${Math.round(avgActiveMinutes)} active minutes. Physical activity supports mental well-being.`;
    } else {
      activityInsight = `Moderate activity: averaging ${Math.round(avgSteps)} steps/day. Maintaining regular movement for mental health.`;
    }
    
    insights.push({
      category: 'activity',
      insight: activityInsight,
      severity,
      dateRange,
    });
  }

  // Analyze stress indicators (resting heart rate)
  const heartRateData = fitbitData.filter(d => d.type === 'heartrate');
  if (heartRateData.length > 0) {
    const avgRestingHR = heartRateData.reduce((sum, d) => sum + (d.data.restingHeartRate || 0), 0) / heartRateData.length;
    
    let severity: 'good' | 'concern' | 'alert' = 'good';
    let stressInsight = '';
    
    // Normal resting HR for adults: 60-100 bpm
    // Lower is generally better (athletes: 40-60)
    if (avgRestingHR > 85) {
      severity = 'concern';
      stressInsight = `Elevated resting heart rate: averaging ${Math.round(avgRestingHR)} bpm. May indicate stress, anxiety, poor sleep, or overtraining. Consider relaxation techniques.`;
    } else if (avgRestingHR > 75) {
      severity = 'concern';
      stressInsight = `Slightly elevated resting heart rate: ${Math.round(avgRestingHR)} bpm. Monitor stress levels and practice mindfulness.`;
    } else if (avgRestingHR < 50 && avgRestingHR > 0) {
      stressInsight = `Low resting heart rate: ${Math.round(avgRestingHR)} bpm. Could indicate excellent fitness or potential bradycardia if accompanied by fatigue.`;
    } else {
      stressInsight = `Normal resting heart rate: ${Math.round(avgRestingHR)} bpm. Cardiovascular health appears stable.`;
    }
    
    insights.push({
      category: 'stress',
      insight: stressInsight,
      severity,
      dateRange,
    });
  }

  // Generate overall health summary
  if (insights.length > 0) {
    const hasAlerts = insights.some(i => i.severity === 'alert');
    const hasConcerns = insights.some(i => i.severity === 'concern');
    
    let overallInsight = '';
    if (hasAlerts) {
      overallInsight = 'Health data shows significant concerns requiring attention. Consider lifestyle adjustments and professional consultation if needed.';
    } else if (hasConcerns) {
      overallInsight = 'Some health metrics could be improved for better mental and physical well-being. Small changes can make a big difference.';
    } else {
      overallInsight = 'Overall health metrics are within healthy ranges. Maintaining these patterns supports good mental health.';
    }
    
    insights.push({
      category: 'overall',
      insight: overallInsight,
      severity: hasAlerts ? 'alert' : hasConcerns ? 'concern' : 'good',
      dateRange,
    });
  }

  return insights;
}

/**
 * Format health insights for Mem0 memory storage
 * @param insights - Generated health insights
 * @returns Formatted string for memory
 */
export function formatInsightsForMemory(insights: HealthInsight[]): string {
  if (insights.length === 0) {
    return '';
  }

  const formattedInsights = insights
    .map(i => `[${i.category.toUpperCase()}] ${i.insight}`)
    .join(' ');

  return `Health Summary (${insights[0].dateRange}): ${formattedInsights}`;
}

/**
 * Extract actionable recommendations from insights
 * @param insights - Health insights
 * @returns Array of recommendations
 */
export function extractRecommendations(insights: HealthInsight[]): string[] {
  const recommendations: string[] = [];
  
  insights.forEach(insight => {
    if (insight.severity === 'alert' || insight.severity === 'concern') {
      if (insight.category === 'sleep') {
        recommendations.push('Improve sleep hygiene: consistent bedtime, dark room, no screens before sleep');
      } else if (insight.category === 'activity') {
        recommendations.push('Increase physical activity gradually: start with 10-minute walks, build up slowly');
      } else if (insight.category === 'stress') {
        recommendations.push('Practice stress management: deep breathing, meditation, or progressive muscle relaxation');
      }
    }
  });
  
  return [...new Set(recommendations)]; // Remove duplicates
}
