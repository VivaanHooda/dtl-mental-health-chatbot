-- SQL Schema for embedding cache table
-- Run this in Supabase SQL Editor to enable persistent embedding caching

-- Create embedding_cache table
CREATE TABLE IF NOT EXISTS embedding_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text_hash TEXT NOT NULL UNIQUE,
  text TEXT NOT NULL,
  embedding FLOAT8[] NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups by text_hash
CREATE INDEX IF NOT EXISTS idx_embedding_cache_text_hash 
ON embedding_cache(text_hash);

-- Index for cleanup queries (find old entries)
CREATE INDEX IF NOT EXISTS idx_embedding_cache_created_at 
ON embedding_cache(created_at DESC);

-- Optional: Function to auto-update accessed_at on SELECT
CREATE OR REPLACE FUNCTION update_accessed_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.accessed_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional: Trigger to track when embeddings are used
CREATE TRIGGER trigger_update_accessed_at
BEFORE UPDATE ON embedding_cache
FOR EACH ROW
EXECUTE FUNCTION update_accessed_at();

-- Enable Row Level Security (RLS)
ALTER TABLE embedding_cache ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read embeddings (they're not sensitive)
CREATE POLICY "Allow public read access" 
ON embedding_cache 
FOR SELECT 
TO public 
USING (true);

-- Policy: Authenticated users can insert embeddings
CREATE POLICY "Allow authenticated insert" 
ON embedding_cache 
FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Policy: Authenticated users can update embeddings (for accessed_at)
CREATE POLICY "Allow authenticated update" 
ON embedding_cache 
FOR UPDATE 
TO authenticated 
USING (true);

-- Policy: Only service role can delete (for cleanup)
CREATE POLICY "Allow service role delete" 
ON embedding_cache 
FOR DELETE 
TO service_role 
USING (true);

-- Comments for documentation
COMMENT ON TABLE embedding_cache IS 'Persistent cache for Gemini text embeddings to reduce API quota usage';
COMMENT ON COLUMN embedding_cache.text_hash IS 'Hash of the original text for fast lookups';
COMMENT ON COLUMN embedding_cache.text IS 'Truncated version of original text (first 500 chars) for reference';
COMMENT ON COLUMN embedding_cache.embedding IS 'Padded 1024-dimensional embedding vector';
COMMENT ON COLUMN embedding_cache.accessed_at IS 'Last time this embedding was retrieved (for LRU cleanup)';
