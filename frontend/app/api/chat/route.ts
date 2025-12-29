import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { queryRAG } from '@/lib/rag/query';
import { generateWithContext } from '@/lib/gemini/client';
import { detectCrisis, detectSevereCrisis, getEmergencyResourcesText, getSevereEmergencyResourcesText } from '@/lib/safety/crisis-detection';
import { searchMemories, addMemory, MEMORY_CATEGORIES } from '@/lib/mem0/client';
import { analyzeHealthDataWithAI, formatAIInsightsForMemory } from '@/lib/fitbit/ai-analyzer';
import { sendEmergencyAlert } from '@/lib/email/crisis-alert';

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
    if (isCrisis) {
      console.log('🚨 CHAT: CRISIS DETECTED - Priority response mode');
    }

    // Retrieve memories
    let userMemories: any[] = [];
    try {
      console.log('🔵 CHAT: Retrieving user memories from Mem0...');
      const memoryResult = await searchMemories(user.id, message, { limit: 5, threshold: 0.3 });
      if (memoryResult.success && memoryResult.memories) {
        userMemories = memoryResult.memories;
        console.log('🟢 CHAT: Retrieved', userMemories.length, 'relevant memories');
      }
    } catch (memoryError: any) {
      console.warn('⚠️ CHAT: Memory retrieval failed:', memoryError.message);
    }

    // Fetch Fitbit data
    let fitbitData: any = null;
    try {
      console.log('🔵 CHAT: Fetching Fitbit health data...');
      const { data: fitbitTokens } = await supabase
        .from('fitbit_tokens')
        .select('fitbit_user_id')
        .eq('user_id', user.id)
        .single();

      if (fitbitTokens) {
        const { data: recentData } = await supabase
          .from('fitbit_data')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(7);

        if (recentData && recentData.length > 0) {
          fitbitData = {
            connected: true,
            recentData: recentData.map(d => ({
              date: d.date,
              type: d.data_type,
              data: d.data
            }))
          };
          console.log('🟢 CHAT: Retrieved', recentData.length, 'days of Fitbit data');
        }
      }
    } catch (fitbitError: any) {
      console.warn('⚠️ CHAT: Failed to fetch Fitbit data:', fitbitError.message);
    }

    // AI health insights
    let healthInsightsText: string = '';
    let aiHealthInsights: any = null;
    if (fitbitData?.recentData && fitbitData.recentData.length > 0) {
      try {
        const memoryContext = userMemories.length > 0
          ? userMemories.map(m => m.memory).join('. ')
          : undefined;

        aiHealthInsights = await analyzeHealthDataWithAI(fitbitData.recentData, memoryContext);

        if (aiHealthInsights) {
          const dateRange = `${fitbitData.recentData[fitbitData.recentData.length - 1]?.date} to ${fitbitData.recentData[0]?.date}`;
          healthInsightsText = formatAIInsightsForMemory(aiHealthInsights, dateRange);
          console.log('🟢 CHAT: AI health analysis complete. Urgency:', aiHealthInsights.urgencyLevel);
        }
      } catch (insightError: any) {
        console.warn('⚠️ CHAT: Failed to generate AI health insights:', insightError.message);
      }
    }

    // Query RAG
    let relevantChunks: any[] = [];
    const ragEnabled = process.env.ENABLE_RAG !== 'false';

    if (ragEnabled) {
      try {
        console.log('🔵 CHAT: Querying RAG system...');
        relevantChunks = await queryRAG(message, 5);
        console.log('🟢 CHAT: Retrieved', relevantChunks.length, 'context chunks');
      } catch (ragError: any) {
        console.warn('⚠️ CHAT: RAG query failed:', ragError.message);
      }
    }

    // Generate response
    console.log('🔵 CHAT: Generating response with Ollama...');
    const response = await generateWithContext(
      message,
      relevantChunks,
      conversationHistory || [],
      fitbitData,
      isCrisis,
      userMemories,
      aiHealthInsights
    );

    // Add emergency resources if crisis
    let finalResponse = response;
    if (isCrisis) {
      finalResponse = response + '\n\n' + getEmergencyResourcesText();
      console.log('🚨 CHAT: Crisis response enhanced with emergency resources');
    }

    console.log('🟢 CHAT: Response generated successfully');

    // Store health insights in memory
    if (healthInsightsText && aiHealthInsights) {
      addMemory(user.id, [
        { role: 'user', content: 'Health data analysis requested' },
        { role: 'assistant', content: healthInsightsText }
      ], {
        category: MEMORY_CATEGORIES.HEALTH_INSIGHTS,
        urgency: aiHealthInsights.urgencyLevel,
        patterns: aiHealthInsights.patterns,
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
      sources: relevantChunks.map(chunk => ({
        filename: chunk.metadata.filename,
        score: chunk.score,
        pageNumber: chunk.metadata.pageNumber,
      })),
      contextUsed: relevantChunks.length > 0,
      fitbitDataUsed: !!fitbitData,
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