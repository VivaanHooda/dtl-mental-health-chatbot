// Crisis detection keywords and emergency resources

// SEVERE crisis keywords that disable chat entirely
export const SEVERE_CRISIS_KEYWORDS = [
  'suicide',
  'kill myself',
  'end my life',
  'commit suicide',
  'suicidal',
  'want to die',
  'end it all',
  'better off dead',
  'no reason to live',
  'planning to die',
  'going to kill',
  'hang myself',
  'jump off',
  'overdose on purpose',
];

// Regular crisis keywords (chat continues with support)
export const CRISIS_KEYWORDS = [
  // Self-harm indicators
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
 * Detects if a message contains SEVERE crisis indicators that require disabling chat
 * @param message - User's message to analyze
 * @returns true if severe crisis keywords detected
 */
export function detectSevereCrisis(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return SEVERE_CRISIS_KEYWORDS.some(keyword => lowerMessage.includes(keyword));
}

/**
 * Detects if a message contains crisis indicators
 * @param message - User's message to analyze
 * @returns true if crisis keywords detected
 */
export function detectCrisis(message: string): boolean {
  const lowerMessage = message.toLowerCase();
  return CRISIS_KEYWORDS.some(keyword => lowerMessage.includes(keyword)) || detectSevereCrisis(message);
}

/**
 * Gets formatted emergency resources text for severe crisis
 * @returns Formatted emergency resources string for chat-disabling situations
 */
export function getSevereEmergencyResourcesText(): string {
  const resources = EMERGENCY_RESOURCES.india;
  
  let text = `🚨 **EMERGENCY - PLEASE SEEK IMMEDIATE HELP** 🚨\n\n`;
  text += `I'm deeply concerned about what you've shared. **This chat cannot provide the urgent support you need right now.**\n\n`;
  text += `**Please contact one of these resources IMMEDIATELY:**\n\n`;
  
  text += `**24/7 Crisis Hotlines (Call NOW):**\n`;
  resources.hotlines.forEach(hotline => {
    text += `• **${hotline.name}**: **${hotline.number}** (${hotline.hours})\n`;
  });
  
  text += `\n**Emergency Services:**\n`;
  text += `• **Call 108** for immediate medical assistance\n`;
  text += `• Visit the nearest hospital emergency room\n`;
  text += `• Contact campus security or go to Student Welfare Office\n\n`;
  
  text += `**Please tell someone you trust right now:**\n`;
  text += `• A friend or family member\n`;
  text += `• Your roommate or hostel warden\n`;
  text += `• A professor or counselor\n\n`;
  
  text += `**Your life matters. Professional help is available. You are not alone.**\n\n`;
  text += `*This chat is temporarily disabled for your safety. Please use the resources above.*`;
  
  return text;
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
