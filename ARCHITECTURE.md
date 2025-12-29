# Mental Health Chatbot - Architecture Overview

## 🎯 Current Tools (4 Total)

### 1. **searchMemories** (Mem0 AI)
- **What**: Searches past conversations and user context
- **When**: ✅ **ALWAYS RUNS** (automatic, parallel)
- **Data Source**: Mem0 API (cloud service)
- **Speed**: Fast (~500ms)
- **Example**: "User mentioned anxiety about exams before", "User prefers meditation over breathing exercises"

### 2. **getFitbitHealthData**
- **What**: Retrieves recent health metrics (sleep, steps, heart rate)
- **When**: ✅ **ALWAYS RUNS** (automatic, parallel)
- **Data Source**: 🔄 **Supabase** (NOT Fitbit servers directly)
- **Speed**: Fast (~200ms)
- **Example**: Last 7 days of sleep data, activity levels, resting heart rate

### 3. **queryRAG** (Knowledge Base)
- **What**: Searches mental health knowledge base (uploaded PDFs)
- **When**: ❓ **ONLY WHEN FLASH DECIDES** (educational content needed)
- **Data Source**: Pinecone vector database
- **Speed**: Slower (~1-2s)
- **Example**: "What is CBT?", "Exam anxiety coping strategies"

### 4. **analyzeHealthWithAI**
- **What**: AI analysis correlating health data with mental well-being
- **When**: 🔄 **CONDITIONAL** (only if Fitbit data exists)
- **Data Source**: Ollama (local AI, processes Fitbit data from Supabase)
- **Speed**: Medium (~1s)
- **Example**: "Low sleep + high stress detected" → "This may increase anxiety"

---

## 🔄 Data Flow Architecture

### **Fitbit Data Pipeline** (Background Process)

```
Fitbit Servers 
    ↓ (OAuth, every 12 hours via cron job)
Fitbit API (`/api/fitbit/data`)
    ↓ (fetch steps, sleep, heart rate)
Supabase Database (`fitbit_data` table)
    ↓ (when user sends chat message)
Flash Orchestrator (reads from Supabase)
    ↓
DeepSeek (generates response with context)
```

#### Key Points:
1. **Fitbit → Supabase**: Background sync (not real-time)
   - Cron job runs periodically
   - Fetches last 7 days from Fitbit API
   - Stores in `fitbit_data` table (columns: `user_id`, `date`, `data_type`, `data`)

2. **Supabase → Chat**: Real-time during conversation
   - When user sends message → orchestrator queries Supabase
   - No direct Fitbit API call during chat
   - Much faster (local DB query vs external API)

---

## 🚀 Two-Stage Chat Architecture

### **Stage 1: Context Orchestration (Gemini Flash)**

```javascript
// Parallel Execution (fast!)
Promise.allSettled([
  searchMemories(),      // ALWAYS - Mem0 API
  getFitbitHealthData(), // ALWAYS - Supabase DB
  shouldCallRAG()        // DECISION - Flash decides
])

// Sequential (only if needed)
if (hasRAG) queryRAG()           // Pinecone
if (hasFitbit) analyzeHealthAI() // Ollama
```

**Timeline**:
- Memories + Fitbit: ~500ms (parallel)
- Flash decision: ~200ms
- RAG (if needed): +1-2s
- Health analysis (if exists): +1s
- **Total**: 2-4s (vs old 50s sequential!)

### **Stage 2: Response Generation (DeepSeek/Ollama)**

```javascript
buildDeepSeekPrompt(
  userMessage,
  context: {
    memories: [...],      // From Mem0
    ragChunks: [...],     // From Pinecone (optional)
    fitbitData: {...},    // From Supabase
    healthAnalysis: {...} // From Ollama (optional)
  }
)
↓
DeepSeek generates empathetic response (~5-10s)
```

---

## 📊 Data Sources Summary

| Tool | Service | Location | Speed | Always Called? |
|------|---------|----------|-------|----------------|
| **searchMemories** | Mem0 AI | Cloud API | 🟢 Fast | ✅ Yes |
| **getFitbitHealthData** | Supabase | Database | 🟢 Very Fast | ✅ Yes |
| **queryRAG** | Pinecone | Vector DB | 🟡 Medium | ❌ Only if Flash decides |
| **analyzeHealthWithAI** | Ollama | Local | 🟡 Medium | 🔄 If Fitbit data exists |

---

## 🔍 When is RAG Called?

**Gemini Flash decides based on:**

✅ **Call RAG for:**
- Educational questions: "What is cognitive behavioral therapy?"
- Coping strategies: "How to manage exam stress?"
- Mental health concepts: "Explain anxiety disorders"
- Professional guidance: "When should I see a therapist?"

❌ **Don't call RAG for:**
- Personal feelings: "I'm feeling sad today"
- Greetings: "Hi, how are you?"
- Health data questions: "How did I sleep last night?"
- Casual conversation: "Tell me about your day"

---

## 💾 Fitbit Data: Push vs Fetch

### **Background Sync (PUSH to Supabase)**
```bash
# Runs via cron job or manual trigger
GET /api/fitbit/data
  → Fetch from Fitbit API (https://api.fitbit.com)
  → Transform data (activity, sleep, heart rate)
  → INSERT into Supabase fitbit_data table
```

**When**: 
- Every 12-24 hours (configurable)
- After user connects Fitbit
- Manual refresh button

### **Chat Context (FETCH from Supabase)**
```typescript
// In flash-orchestrator.ts
executeFitbitFetch(userId, { days: 7 })
  → Query Supabase: SELECT * FROM fitbit_data WHERE user_id = ...
  → Return cached data (FAST, no Fitbit API call)
```

**Why this approach?**
1. ✅ **Speed**: Database query (50ms) vs Fitbit API (2-3s)
2. ✅ **Rate limits**: Avoid hitting Fitbit API limit during chat
3. ✅ **Reliability**: Works even if Fitbit API is slow/down
4. ✅ **Cost**: Fewer API calls to Fitbit

---

## 🎛️ Configuration

### Environment Variables
```bash
# Gemini Flash (Tool Orchestration)
GEMINI_API_KEY=AIza...  # Free tier, decides when to call RAG

# Ollama (Response Generation + Health Analysis)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=med-assistant
OLLAMA_EMBED_MODEL=nomic-embed-text

# Mem0 (Memory)
MEM0_API_KEY=m0-Xq...

# Pinecone (RAG)
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=mental-health-rag

# Fitbit (OAuth + Data Sync)
FITBIT_CLIENT_ID=...
FITBIT_CLIENT_SECRET=...

# Supabase (Database)
NEXT_PUBLIC_SUPABASE_URL=https://...
```

---

## 🔧 Key Files

```
lib/
├── gemini/
│   ├── flash-client.ts         # Gemini 2.5 Flash initialization
│   ├── flash-orchestrator.ts   # Main orchestration logic ⭐
│   ├── tool-schemas.ts         # Tool definitions for Flash
│   └── client.ts               # Legacy (embeddings only)
├── mem0/
│   └── client.ts               # Mem0 memory search/add
├── rag/
│   └── query.ts                # Pinecone vector search
├── fitbit/
│   ├── api.ts                  # Fitbit API calls (background sync)
│   └── ai-analyzer.ts          # Ollama health analysis
├── ollama/
│   ├── client.ts               # DeepSeek response generation
│   └── context-builder.ts      # Format context for DeepSeek
└── supabase/
    ├── server.ts               # Database client
    └── client.ts               # Browser client

app/api/
├── chat/route.ts               # Main chat endpoint ⭐
└── fitbit/
    └── data/route.ts           # Background Fitbit sync
```

---

## 📈 Performance Comparison

### Before (Sequential)
```
searchMemories()     → 2s
queryRAG()          → 5s
getFitbitData()     → 3s
analyzeHealth()     → 8s
generateResponse()  → 30s
─────────────────────────
TOTAL: ~50s 😱
```

### After (Parallel with Flash)
```
┌─ searchMemories()      → 500ms ─┐
├─ getFitbitData()       → 200ms  ├─→ 700ms ✅
└─ shouldCallRAG()       → 300ms ─┘
   └─ queryRAG() (if needed) → 1.5s
   └─ analyzeHealth()        → 1s
generateResponse()           → 8s
──────────────────────────────────
TOTAL: ~10s 🚀 (5x faster!)
```

---

## 🎯 Summary

**Tools**: 4 (Memories, Fitbit, RAG, Health Analysis)

**Data Sources**:
- Mem0 API (memories) - cloud
- Supabase (Fitbit data) - **cached from Fitbit API**
- Pinecone (RAG knowledge) - vector DB
- Ollama (AI analysis) - local

**Fitbit Flow**:
- 🔄 **Background**: Fitbit API → Supabase (periodic sync)
- ⚡ **Chat time**: Supabase → Flash Orchestrator (instant)

**Smart Strategy**:
- ✅ Always fetch: Memories + Fitbit (fast, always useful)
- ❓ Conditional: RAG only when educational content needed
- 🎯 Result: 5x faster, smarter context gathering
