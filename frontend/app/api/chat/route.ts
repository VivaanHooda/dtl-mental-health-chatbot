import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { detectCrisis, detectSevereCrisis, getEmergencyResourcesText, getSevereEmergencyResourcesText } from '@/lib/safety/crisis-detection';
import { addMemory, MEMORY_CATEGORIES } from '@/lib/mem0/client';
import { formatAIInsightsForMemory } from '@/lib/fitbit/ai-analyzer';
import { sendEmergencyAlert } from '@/lib/email/crisis-alert';
import { orchestrateWithTimeout } from '@/lib/gemini/flash-orchestrator';
import { buildDeepSeekPrompt, getContextSummary } from '@/lib/ollama/context-builder';
import { generateText as ollamaGenerateText } from '@/lib/ollama/client';

export async function POST(request: NextRequest) {
  console.log('🔵 CHAT: Received chat request');

  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('🔴 CHAT: Auth failed:', authError?.message);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🟢 CHAT: User authenticated:', user.id.substring(0, 8) + '...');

    const body = await request.json();
    const { message, conversationHistory } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    console.log('🔵 CHAT: User message:', message.substring(0, 100));

    // Check for SEVERE crisis
    const isSevereCrisis = detectSevereCrisis(message);

    if (isSevereCrisis) {
      console.log('🚨🚨 CHAT: SEVERE CRISIS DETECTED - EMERGENCY PROTOCOL ACTIVATED');

      // Get user profile with emergency contact
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('username, email, emergency_contact_email')
        .eq('user_id', user.id)
        .single();

      let emergencyResponse = getSevereEmergencyResourcesText();
      let emailSent = false;

      // Send emergency email if contact is linked
      if (profile?.emergency_contact_email) {
        console.log('📧 CHAT: Emergency contact found, sending alert...');

        emailSent = await sendEmergencyAlert({
          emergencyContactEmail: profile.emergency_contact_email,
          userName: profile.username || 'User',
          userEmail: profile.email || user.email || '',
          timestamp: new Date(),
        });

        if (emailSent) {
          console.log('✅ CHAT: Emergency alert email sent successfully');
          emergencyResponse += '\n\n---\n\n**✅ Emergency Alert Sent**\n\nAn emergency notification has been sent to your emergency contact. Help is on the way.';
        } else {
          console.warn('⚠️ CHAT: Failed to send emergency email');
        }
      } else {
        console.log('⚪ CHAT: No emergency contact linked');
        emergencyResponse += '\n\n---\n\n**ℹ️ No Emergency Contact Linked**\n\nConsider adding an emergency contact in your dashboard settings for faster support in crisis situations.';
      }

      // Store the emergency interaction
      try {
        await supabase.from('chat_messages').insert([
          {
            user_id: user.id,
            role: 'user',
            content: message,
            created_at: new Date().toISOString(),
          },
          {
            user_id: user.id,
            role: 'assistant',
            content: emergencyResponse,
            created_at: new Date().toISOString(),
          },
        ]);
      } catch (dbError) {
        console.warn('⚠️ CHAT: Failed to save emergency interaction:', dbError);
      }

      return NextResponse.json({
        success: true,
        response: emergencyResponse,
        sources: [],
        contextUsed: false,
        fitbitDataUsed: false,
        crisisDetected: true,
        severeCrisis: true,
        chatDisabled: true,
        emailSent,
      });
    }

    // Check for regular crisis
    const isCrisis = detectCrisis(message);

    // Get user profile for personalization
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('username, email')
      .eq('user_id', user.id)
      .single();

    const userName = profile?.username || profile?.email?.split('@')[0] || 'Student';

    // Two-stage architecture: Flash orchestrates tools, DeepSeek generates response
    const context = await orchestrateWithTimeout(
      user.id,
      message,
      conversationHistory || [],
      userName,
      5000,
      profile
    );

    const prompt = buildDeepSeekPrompt(
      message,
      context,
      conversationHistory || [],
      { isCrisis, userName }
    );

    const response = await ollamaGenerateText(prompt, {
      temperature: 0.7,
      maxTokens: 2048,
    });

    // Add emergency resources if crisis
    let finalResponse = response;
    if (isCrisis) {
      finalResponse = response + '\n\n' + getEmergencyResourcesText();
      console.log('🚨 CHAT: Crisis response enhanced with emergency resources');
    }

    console.log('🟢 CHAT: Response generated successfully');

    // Store health insights in memory (background, non-blocking)
    if (context.healthAnalysis) {
      const dateRange = context.fitbitData?.recentData
        ? `${context.fitbitData.recentData[context.fitbitData.recentData.length - 1]?.date} to ${context.fitbitData.recentData[0]?.date}`
        : 'recent';
      const healthInsightsText = formatAIInsightsForMemory(context.healthAnalysis, dateRange);

      addMemory(user.id, [
        { role: 'user', content: 'Health data analysis requested' },
        { role: 'assistant', content: healthInsightsText }
      ], {
        category: MEMORY_CATEGORIES.HEALTH_INSIGHTS,
        urgency: context.healthAnalysis.urgencyLevel,
        patterns: context.healthAnalysis.patterns,
      }).catch(error => {
        console.warn('⚠️ CHAT: Failed to store health insights in memory:', error);
      });
    }

    // Store conversation memory
    if (!isCrisis) {
      addMemory(user.id, [
        { role: 'user', content: message },
        { role: 'assistant', content: finalResponse }
      ], {
        category: MEMORY_CATEGORIES.CONVERSATION,
      }).catch(error => {
        console.warn('⚠️ CHAT: Failed to store conversation memory:', error);
      });
    }

    // Store in database
    try {
      await supabase.from('chat_messages').insert([
        {
          user_id: user.id,
          role: 'user',
          content: message,
          created_at: new Date().toISOString(),
        },
        {
          user_id: user.id,
          role: 'assistant',
          content: finalResponse,
          created_at: new Date().toISOString(),
        },
      ]);
      console.log('🟢 CHAT: Conversation saved to database');
    } catch (dbError) {
      console.warn('⚠️ CHAT: Failed to save conversation:', dbError);
    }

    return NextResponse.json({
      success: true,
      response: finalResponse,
      sources: context.ragChunks.map(chunk => ({
        filename: chunk.metadata.filename,
        score: chunk.score,
        pageNumber: chunk.metadata.pageNumber,
      })),
      contextUsed: context.ragChunks.length > 0,
      fitbitDataUsed: !!context.fitbitData,
      memoriesUsed: context.memories.length,
      toolsUsed: context.toolsUsed,
      orchestrationTimeMs: context.executionTimeMs,
      crisisDetected: isCrisis,
    });

  } catch (error: any) {
    console.error('🔴 CHAT: Error occurred:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });

    let errorMessage = error.message || 'Failed to generate response';

    if (error.message?.includes('not running') || error.message?.includes('ECONNREFUSED')) {
      errorMessage = 'AI service (Ollama) is not running. Please start Ollama with: ollama serve';
    } else if (error.message?.includes('not found') && error.message?.includes('model')) {
      errorMessage = 'AI model not found. Please pull the required models in Ollama.';
    } else if (error.message?.includes('PINECONE')) {
      errorMessage = 'Vector database is not configured properly. Some features may be limited.';
    } else if (error.message?.includes('timeout')) {
      errorMessage = 'Request timed out. The AI model may be loading or overloaded.';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}