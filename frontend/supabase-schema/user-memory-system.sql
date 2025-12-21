-- SQL Schema for User Memory System
-- Run this in Supabase SQL Editor

-- 1. User Memory Profiles (Long-term persistent memory)
CREATE TABLE IF NOT EXISTS user_memory_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal context
  preferences JSONB DEFAULT '{}'::jsonb,          -- Communication style, topics
  concerns JSONB DEFAULT '[]'::jsonb,             -- Recurring concerns/themes
  goals JSONB DEFAULT '[]'::jsonb,                -- Mental health goals
  triggers JSONB DEFAULT '[]'::jsonb,             -- Known stress triggers
  coping_strategies JSONB DEFAULT '[]'::jsonb,    -- What works for them
  
  -- Relationship context
  mentioned_people JSONB DEFAULT '[]'::jsonb,     -- Friends, family mentioned
  important_events JSONB DEFAULT '[]'::jsonb,     -- Upcoming exams, events
  
  -- Behavioral patterns
  activity_patterns JSONB DEFAULT '{}'::jsonb,    -- When they're most active
  crisis_history JSONB DEFAULT '[]'::jsonb,       -- Past crisis detections
  
  -- Metadata
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  session_count INTEGER DEFAULT 0,
  total_messages INTEGER DEFAULT 0,
  
  UNIQUE(user_id)
);

-- 2. Conversation Summaries (Medium-term memory)
CREATE TABLE IF NOT EXISTS conversation_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  conversation_date DATE NOT NULL,
  message_count INTEGER NOT NULL,
  
  -- AI-generated summary
  summary TEXT NOT NULL,                          -- Key points from conversation
  topics JSONB DEFAULT '[]'::jsonb,               -- Main topics discussed
  sentiment VARCHAR(20),                          -- overall, positive, negative, mixed
  key_insights JSONB DEFAULT '[]'::jsonb,         -- Important learnings
  
  -- Flags
  crisis_detected BOOLEAN DEFAULT FALSE,
  fitbit_data_available BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Memory Extraction Queue (For async processing)
CREATE TABLE IF NOT EXISTS memory_extraction_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  messages JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',           -- pending, processing, completed, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX idx_user_memory_profiles_user_id ON user_memory_profiles(user_id);
CREATE INDEX idx_conversation_summaries_user_id ON conversation_summaries(user_id);
CREATE INDEX idx_conversation_summaries_date ON conversation_summaries(conversation_date DESC);
CREATE INDEX idx_memory_queue_status ON memory_extraction_queue(status, created_at);

-- Enable RLS
ALTER TABLE user_memory_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_extraction_queue ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own memory profile" 
ON user_memory_profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own memory profile" 
ON user_memory_profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own memory profile" 
ON user_memory_profiles FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own conversation summaries" 
ON conversation_summaries FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert conversation summaries" 
ON conversation_summaries FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- Comments
COMMENT ON TABLE user_memory_profiles IS 'Long-term AI memory about each user - preferences, patterns, context';
COMMENT ON TABLE conversation_summaries IS 'Summarized past conversations for context retrieval';
COMMENT ON TABLE memory_extraction_queue IS 'Queue for async memory processing after conversations';
