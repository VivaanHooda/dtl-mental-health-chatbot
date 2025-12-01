// Crisis detection keywords and emergency resources

export const CRISIS_KEYWORDS = [
  // Self-harm indicators
  'kill myself',
  'end my life',
  'commit suicide',
  'suicidal',
  'want to die',
  'better off dead',
  'no reason to live',
  'hurt myself',
  'self harm',
  'cut myself',
  'overdose',
  
  // Severe distress
  'can\'t go on',
  'give up on life',
  'hopeless',
  'worthless',
  'no point in living',
  'end it all',
];

export const EMERGENCY_RESOURCES = {
  india: {
    name: 'India Emergency Mental Health Resources',
    hotlines: [
      {
        name: 'AASRA - 24/7 Suicide Prevention',
        number: '91-9820466726',
        hours: '24/7',
      },
      {
        name: 'Vandrevala Foundation',
        number: '1860-2662-345 / 1800-2333-330',
        hours: '24/7',
      },
      {
        name: 'iCall - Psychological Support',
        number: '9152987821',
        hours: 'Mon-Sat, 8 AM - 10 PM',
      },
      {
        name: 'NIMHANS Crisis Helpline',
        number: '080-46110007',
        hours: 'Mon-Sat, 9 AM - 5:30 PM',
      },
    ],
    campusResources: [
      {
        name: 'RVCE Counseling Center',
        contact: 'Visit Student Welfare Office',
        hours: 'During college hours',
      },
      {
        name: 'Bangalore Emergency Services',
        number: '108 (Ambulance)',
        hours: '24/7',
      },
    ],
  },
  international: {
    name: 'International Suicide Prevention',
    number: 'Visit https://findahelpline.com',
  },
};

/**
 * Detects if a message contains crisis indicators
 * @param message - User's message to analyze
 * @returns true if crisis keywords detected
 */
export function detectCrisis(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Gets formatted emergency resources text
 * @returns Formatted emergency resources string
 */
export function getEmergencyResourcesText(): string {
  const resources = EMERGENCY_RESOURCES.india;
  
  let text = `\n\n🚨 **IMMEDIATE HELP AVAILABLE** 🚨\n\n`;
  text += `I'm concerned about your safety. Please reach out to one of these resources right now:\n\n`;
  
  text += `**24/7 Crisis Hotlines:**\n`;
  resources.hotlines.forEach(hotline => {
    text += `• **${hotline.name}**: ${hotline.number} (${hotline.hours})\n`;
  });
  
  text += `\n**Campus Resources:**\n`;
  resources.campusResources.forEach(resource => {
    text += `• **${resource.name}**: ${resource.contact || resource.number} (${resource.hours})\n`;
  });
  
  text += `\n**If this is an emergency:**\n`;
  text += `• Call **108** for immediate medical assistance\n`;
  text += `• Visit the nearest hospital emergency room\n`;
  text += `• Contact campus security or a trusted friend/family member\n\n`;
  
  text += `**You are not alone. Help is available, and people care about you.**\n`;
  
  return text;
}

/**
 * Gets a crisis-aware AI prompt addition
 * @returns Prompt text to add for crisis situations
 */
export function getCrisisPromptAddition(): string {
  return `\n\n⚠️ **CRITICAL SAFETY ALERT**: The student's message contains indicators of potential self-harm or suicidal ideation.

**YOU MUST:**
1. Express immediate concern and empathy
2. STRONGLY encourage them to contact crisis resources immediately
3. Emphasize that their life has value and help is available
4. Provide the emergency resources list
5. Suggest they speak with a trusted person (friend, family, counselor) RIGHT NOW
6. Do NOT provide generic advice - this is a crisis requiring professional intervention

**Prioritize safety above all else in your response.**`;
}
