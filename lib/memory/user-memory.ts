// User Memory Management System
import { createClient } from '@/lib/supabase/server';

export interface UserMemoryProfile {
  preferences: {
    communication_style?: string;
    preferred_topics?: string[];
    avoid_topics?: string[];
    time_of_day_active?: string;
  };
  concerns: Array<{
    topic: string;
    first_mentioned: string;
    frequency: number;
    severity?: 'low' | 'medium' | 'high';
  }>;
  goals: Array<{
    goal: string;
    set_date: string;
    status: 'active' | 'achieved' | 'dropped';
    progress?: string;
  }>;
  triggers: Array<{
    trigger: string;
    identified_date: string;
    context?: string;
  }>;
  coping_strategies: Array<{
    strategy: string;
    effectiveness: 'high' | 'medium' | 'low';
    last_used?: string;
  }>;
  mentioned_people: Array<{
    name: string;
    relationship?: string;
    context?: string;
  }>;
  important_events: Array<{
    event: string;
    date: string;
    status: 'upcoming' | 'past';
  }>;
  activity_patterns: {
    most_active_time?: string;
    avg_session_duration?: number;
    preferred_day?: string;
  };
  crisis_history: Array<{
    date: string;
    severity: string;
    resolved: boolean;
  }>;
}

/**
 * Get user's memory profile
 */
export async function getUserMemoryProfile(userId: string): Promise<UserMemoryProfile | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('user_memory_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.log('⚪ No memory profile found, creating new one');
    return null;
  }

  return {
    preferences: data.preferences || {},
    concerns: data.concerns || [],
    goals: data.goals || [],
    triggers: data.triggers || [],
    coping_strategies: data.coping_strategies || [],
    mentioned_people: data.mentioned_people || [],
    important_events: data.important_events || [],
    activity_patterns: data.activity_patterns || {},
    crisis_history: data.crisis_history || [],
  };
}

/**
 * Update user's memory profile
 */
export async function updateUserMemoryProfile(
  userId: string,
  updates: Partial<UserMemoryProfile>
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('user_memory_profiles')
    .upsert({
      user_id: userId,
      ...updates,
      last_updated: new Date().toISOString(),
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Failed to update memory profile:', error);
    throw error;
  }
}

/**
 * Get recent conversation summaries
 */
export async function getRecentConversationSummaries(
  userId: string,
  limit: number = 5
): Promise<any[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('conversation_summaries')
    .select('*')
    .eq('user_id', userId)
    .order('conversation_date', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch conversation summaries:', error);
    return [];
  }

  return data || [];
}

/**
 * Save conversation summary
 */
export async function saveConversationSummary(
  userId: string,
  summary: {
    summary: string;
    topics: string[];
    sentiment: string;
    key_insights: string[];
    crisis_detected: boolean;
    fitbit_data_available: boolean;
    message_count: number;
  }
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('conversation_summaries')
    .insert({
      user_id: userId,
      conversation_date: new Date().toISOString().split('T')[0],
      ...summary,
    });

  if (error) {
    console.error('Failed to save conversation summary:', error);
  }
}

/**
 * Generate memory context for AI prompt
 */
export async function generateMemoryContext(userId: string): Promise<string> {
  const profile = await getUserMemoryProfile(userId);
  const summaries = await getRecentConversationSummaries(userId, 3);

  if (!profile && summaries.length === 0) {
    return '';
  }

  let context = '\n## Student Memory & Context:\n';

  // Long-term memory
  if (profile) {
    if (profile.concerns.length > 0) {
      context += '\n### Ongoing Concerns:\n';
      profile.concerns.slice(0, 3).forEach(concern => {
        context += `- ${concern.topic} (mentioned ${concern.frequency} times)\n`;
      });
    }

    if (profile.goals.length > 0) {
      const activeGoals = profile.goals.filter(g => g.status === 'active');
      if (activeGoals.length > 0) {
        context += '\n### Current Goals:\n';
        activeGoals.forEach(goal => {
          context += `- ${goal.goal}\n`;
        });
      }
    }

    if (profile.coping_strategies.length > 0) {
      context += '\n### Effective Coping Strategies:\n';
      profile.coping_strategies
        .filter(s => s.effectiveness === 'high')
        .forEach(strategy => {
          context += `- ${strategy.strategy}\n`;
        });
    }

    if (profile.important_events.length > 0) {
      const upcoming = profile.important_events.filter(e => e.status === 'upcoming');
      if (upcoming.length > 0) {
        context += '\n### Upcoming Events:\n';
        upcoming.forEach(event => {
          context += `- ${event.event} (${event.date})\n`;
        });
      }
    }
  }

  // Recent conversation summaries
  if (summaries.length > 0) {
    context += '\n### Recent Sessions:\n';
    summaries.forEach(summary => {
      context += `- ${summary.conversation_date}: ${summary.summary}\n`;
      if (summary.key_insights && summary.key_insights.length > 0) {
        context += `  Insights: ${summary.key_insights.join('; ')}\n`;
      }
    });
  }

  context += '\n**Note**: Use this context to provide personalized, continuous support. Reference past conversations naturally when relevant.\n';

  return context;
}

/**
 * Increment session counter
 */
export async function incrementSessionCount(userId: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('increment_session_count', {
    p_user_id: userId
  });

  if (error) {
    console.warn('Failed to increment session count:', error);
  }
}
