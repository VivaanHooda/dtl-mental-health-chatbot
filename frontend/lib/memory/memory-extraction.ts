// Memory Extraction Service - Uses AI to learn from conversations
import { generateWithContext } from '@/lib/gemini/client';
import { updateUserMemoryProfile, saveConversationSummary, getUserMemoryProfile } from './user-memory';

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

/**
 * Extract learnings from conversation and update memory
 * This should be called at the end of a conversation session
 */
export async function extractMemoryFromConversation(
  userId: string,
  messages: ConversationMessage[],
  fitbitDataUsed: boolean = false,
  crisisDetected: boolean = false
): Promise<void> {
  if (messages.length < 2) {
    return; // Not enough for meaningful extraction
  }

  try {
    console.log('🧠 MEMORY: Starting extraction from', messages.length, 'messages');

    // Build conversation text
    const conversationText = messages
      .map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`)
      .join('\n\n');

    // Get current memory profile
    const currentProfile = await getUserMemoryProfile(userId);

    // Ask AI to extract structured learnings
    const extractionPrompt = `You are a memory extraction system for a mental health chatbot. Analyze this conversation and extract key learnings about the student.

# Conversation:
${conversationText}

# Current Memory Profile:
${JSON.stringify(currentProfile, null, 2)}

# Extract the following (return ONLY valid JSON):

{
  "summary": "Brief 2-3 sentence summary of this conversation",
  "topics": ["topic1", "topic2"],
  "sentiment": "positive|negative|neutral|mixed",
  "key_insights": ["insight1", "insight2"],
  "new_concerns": [{"topic": "concern", "severity": "low|medium|high"}],
  "new_goals": [{"goal": "goal description", "status": "active"}],
  "new_triggers": [{"trigger": "trigger description"}],
  "effective_strategies": [{"strategy": "what helped", "effectiveness": "high|medium|low"}],
  "mentioned_people": [{"name": "person", "relationship": "friend|family|other"}],
  "upcoming_events": [{"event": "event description", "date": "YYYY-MM-DD"}]
}

Rules:
- Only extract NEW information not already in current profile
- Be conservative - don't over-interpret
- Focus on actionable insights
- Empty arrays are fine if nothing to extract
- Return ONLY the JSON object, no markdown or explanations`;

    const extractionResult = await generateWithContext(
      extractionPrompt,
      [], // No RAG context needed
      [], // No history needed
      undefined, // No Fitbit data
      false // Not a crisis
    );

    // Parse AI response
    let extraction;
    try {
      // Extract JSON from response (handle if AI adds markdown)
      const jsonMatch = extractionResult.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extraction = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('❌ MEMORY: Failed to parse extraction:', parseError);
      console.error('Raw response:', extractionResult);
      return;
    }

    console.log('✅ MEMORY: Extracted learnings:', extraction);

    // Save conversation summary
    await saveConversationSummary(userId, {
      summary: extraction.summary || 'Conversation occurred',
      topics: extraction.topics || [],
      sentiment: extraction.sentiment || 'neutral',
      key_insights: extraction.key_insights || [],
      crisis_detected: crisisDetected,
      fitbit_data_available: fitbitDataUsed,
      message_count: messages.length,
    });

    // Update memory profile with new learnings
    const updates: any = {};

    if (extraction.new_concerns?.length > 0) {
      const existingConcerns = currentProfile?.concerns || [];
      updates.concerns = [
        ...existingConcerns,
        ...extraction.new_concerns.map((c: any) => ({
          ...c,
          first_mentioned: new Date().toISOString(),
          frequency: 1,
        }))
      ];
    }

    if (extraction.new_goals?.length > 0) {
      const existingGoals = currentProfile?.goals || [];
      updates.goals = [
        ...existingGoals,
        ...extraction.new_goals.map((g: any) => ({
          ...g,
          set_date: new Date().toISOString(),
        }))
      ];
    }

    if (extraction.new_triggers?.length > 0) {
      const existingTriggers = currentProfile?.triggers || [];
      updates.triggers = [
        ...existingTriggers,
        ...extraction.new_triggers.map((t: any) => ({
          ...t,
          identified_date: new Date().toISOString(),
        }))
      ];
    }

    if (extraction.effective_strategies?.length > 0) {
      const existingStrategies = currentProfile?.coping_strategies || [];
      updates.coping_strategies = [
        ...existingStrategies,
        ...extraction.effective_strategies.map((s: any) => ({
          ...s,
          last_used: new Date().toISOString(),
        }))
      ];
    }

    if (extraction.mentioned_people?.length > 0) {
      const existingPeople = currentProfile?.mentioned_people || [];
      updates.mentioned_people = [
        ...existingPeople,
        ...extraction.mentioned_people
      ];
    }

    if (extraction.upcoming_events?.length > 0) {
      const existingEvents = currentProfile?.important_events || [];
      updates.important_events = [
        ...existingEvents,
        ...extraction.upcoming_events.map((e: any) => ({
          ...e,
          status: 'upcoming',
        }))
      ];
    }

    // Update if there are any new learnings
    if (Object.keys(updates).length > 0) {
      await updateUserMemoryProfile(userId, updates);
      console.log('💾 MEMORY: Profile updated with new learnings');
    } else {
      console.log('⚪ MEMORY: No new learnings to save');
    }

  } catch (error) {
    console.error('❌ MEMORY: Extraction failed:', error);
    // Don't throw - memory extraction is non-critical
  }
}

/**
 * Periodic cleanup: Mark old events as past, remove outdated information
 */
export async function cleanupMemoryProfile(userId: string): Promise<void> {
  const profile = await getUserMemoryProfile(userId);
  
  if (!profile) return;

  const updates: any = {};
  const today = new Date();

  // Update event statuses
  if (profile.important_events?.length > 0) {
    updates.important_events = profile.important_events.map(event => {
      const eventDate = new Date(event.date);
      if (eventDate < today && event.status === 'upcoming') {
        return { ...event, status: 'past' as const };
      }
      return event;
    });
  }

  // Remove very old past events (>90 days)
  if (updates.important_events) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    updates.important_events = updates.important_events.filter((event: any) => 
      event.status === 'upcoming' || new Date(event.date) > ninetyDaysAgo
    );
  }

  if (Object.keys(updates).length > 0) {
    await updateUserMemoryProfile(userId, updates);
    console.log('🧹 MEMORY: Cleanup completed');
  }
}
