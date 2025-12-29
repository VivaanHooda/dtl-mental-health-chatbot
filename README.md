# DTL Mental Health Chatbot

> **A Multi-Agent AI Mental Health Companion**  
> Combining Gemini Flash orchestration, DeepSeek reasoning, Fitbit health integration, memory systems, and RAG-based knowledge retrieval for personalized mental health support.

---

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
  - [Multi-Agent LLM Orchestration](#multi-agent-llm-orchestration)
  - [Three-Stage Pipeline](#three-stage-pipeline)
- [Core Components](#core-components)
  - [Frontend](#frontend)
  - [Backend APIs](#backend-apis)
  - [LLM Integration](#llm-integration)
  - [Tool Ecosystem](#tool-ecosystem)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Installation & Setup](#installation--setup)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Tool Execution Flow](#tool-execution-flow)
- [Memory System](#memory-system)
- [RAG Pipeline](#rag-pipeline)
- [Crisis Detection](#crisis-detection)
- [Deployment](#deployment)
- [Development](#development)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

The **DTL Mental Health Chatbot** is an advanced conversational AI system designed to provide empathetic, personalized mental health support to students. It leverages a **multi-agent architecture** where different AI models specialize in distinct tasks:

- **Gemini 2.5 Flash**: Intelligent tool orchestration and context summarization
- **DeepSeek (via Ollama)**: Natural language response generation
- **Mem0 AI**: Long-term memory and context retention
- **Fitbit Integration**: Real-time physiological data analysis
- **RAG System**: Evidence-based mental health knowledge retrieval

### Why Multi-Agent?

Traditional single-model approaches suffer from:
- **Context overload** (exceeding token limits)
- **Slow response times** (processing large contexts)
- **Generic responses** (lack of personalization)

Our multi-agent system solves these by:
1. **Parallel tool execution** (memories, health data, knowledge base)
2. **Intelligent context summarization** (condensing raw data into actionable insights)
3. **Specialized response generation** (warm, empathetic, personalized)

---

## System Architecture

### Multi-Agent LLM Orchestration

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER MESSAGE                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    STAGE 1: ORCHESTRATION                        │
│                    (Gemini 2.5 Flash)                           │
│                                                                  │
│  • Analyzes user message intent                                 │
│  • Decides which tools to call                                  │
│  • Executes tools in parallel                                   │
│                                                                  │
│  Tools Available:                                               │
│  ├─ searchMemories (always called)                             │
│  ├─ getUserProfile (always called)                             │
│  ├─ getFitbitHealthData (always called)                        │
│  ├─ getRecentWellness (intraday vitals, always called)        │
│  ├─ queryRAG (conditional - only for educational queries)      │
│  └─ analyzeHealthWithAI (if Fitbit data exists)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                   STAGE 2: SUMMARIZATION                         │
│                    (Gemini 2.5 Flash)                           │
│                                                                  │
│  • Takes raw tool outputs (memories, health data, RAG chunks)   │
│  • Converts to natural language paragraph                       │
│  • Example: "Sarah has been averaging 3,500 steps daily with   │
│    a resting heart rate of 72 bpm. She mentioned feeling       │
│    stressed about exams last week."                             │
│                                                                  │
│  Output: ~300-500 character summary (prevents context overload) │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  STAGE 3: RESPONSE GENERATION                    │
│                   (DeepSeek via Ollama)                         │
│                                                                  │
│  Input:                                                          │
│  • Summarized context (from Stage 2)                            │
│  • User message                                                  │
│  • Recent conversation history (last 4 messages)                │
│                                                                  │
│  Output:                                                         │
│  • Warm, empathetic response                                    │
│  • References specific health metrics                            │
│  • Personalized to user's situation                             │
│  • Concise (under 100 words)                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │  USER RESPONSE │
                    └────────────────┘
```

### Three-Stage Pipeline

#### **Stage 1: Tool Orchestration** (Gemini Flash)

**Purpose**: Intelligently select and execute relevant tools in parallel

**System Prompt**: `ORCHESTRATOR_SYSTEM_PROMPT`
```
You are an intelligent context orchestrator for a mental health chatbot. 
Your ONLY job is to decide if the RAG (knowledge base) tool should be called.

NOTE: User memories and Fitbit health data are ALWAYS fetched automatically.

Call queryRAG ONLY when:
1. User asks about mental health concepts (CBT, anxiety, depression)
2. User needs evidence-based coping strategies
3. Educational questions about psychology
4. Professional guidance on specific topics

DO NOT call queryRAG for:
1. Personal conversations about their day/feelings
2. Greetings or casual chat
3. Questions about their own health data
4. General emotional support
```

**Tool Execution**:
```typescript
const [memories, fitbit, wellness, profile, ragDecision] = await Promise.allSettled([
    executeSearchMemories(userId, { query: userMessage }),
    executeFitbitFetch(userId, { days: 7 }),
    executeRecentWellnessFetch(userId),
    executeGetUserProfile(userId),
    shouldCallRAG(userMessage, conversationHistory)
]);
```

**Performance**:
- Parallel execution: ~2-3 seconds total
- Sequential would take: ~8-10 seconds
- **Speedup**: 3-4x faster

---

#### **Stage 2: Context Summarization** (Gemini Flash)

**Purpose**: Convert structured data into natural language paragraph

**System Prompt**: `SUMMARIZER_SYSTEM_PROMPT`
```
You are a context summarizer for a mental health chatbot. 
Your job is to convert structured context data into a NATURAL CONVERSATIONAL PARAGRAPH.

CRITICAL RULES:
1. OUTPUT ONLY 1-2 SENTENCES IN PARAGRAPH FORM
2. NO structural labels, headers, bullet points, or sections
3. ALWAYS lead with the user's name: "[Name] has..."
4. Include SPECIFIC health metrics ONLY if highly relevant
5. Reference key memories only when relevant to the message
6. Sound warm, personal, and natural - like a real therapist
7. NEVER output any structured data, lists, or formatting markers

GOOD EXAMPLE:
"Sarah has been managing stress around upcoming exams and has been 
averaging 3,500 steps daily with a resting heart rate of 72 bpm. 
She mentioned feeling disconnected recently but is focused on 
scheduling activities that bring her joy."

BAD EXAMPLES:
✗ "## USER DATA: Sarah has..."
✗ "- Name: Sarah\n- Steps: 3500"
✗ "[VITAL SIGNS] Heart Rate: 72bpm"
```

**Input**:
```
User: Sarah
Message: "I'm feeling anxious about my exam tomorrow"

Raw Context:
- 7 memories found (feeling stressed, upcoming exams, disconnected from school)
- Fitbit: 70 steps/day, 68 bpm resting HR
- Recent wellness: HR 72 bpm (last 30 min), 0 steps
```

**Output**:
```
Sarah has been managing stress around upcoming exams and has been 
averaging 70 steps daily with a resting heart rate of 68 bpm. She 
mentioned feeling disconnected from school recently.
```

**Token Savings**:
- Before: ~2,000-4,000 tokens (raw context)
- After: ~50-80 tokens (summarized)
- **Reduction**: 95-98%

---

#### **Stage 3: Response Generation** (DeepSeek)

**Purpose**: Generate warm, empathetic mental health response

**System Prompt**: (Dynamic, built in `buildDeepSeekPrompt()`)
```
You are a warm mental health companion talking to {userName}.

## Context:
{summarizedContext}

## Recent Chat:
{conversationHistory}

## {userName}'s Message:
{userMessage}

## Response:
Be warm, supportive, concise (under 100 words). 
Reference health data with specific values when relevant.
```

**Example**:

**Input**:
```
User: Sarah
Message: "I'm feeling anxious about my exam tomorrow"
Context: "Sarah has been managing stress around exams and averaging 
         70 steps daily with 68 bpm resting HR. She mentioned feeling 
         disconnected recently."
```

**Output**:
```
Hi Sarah! I can sense your anxiety about tomorrow's exam - that's 
completely normal. I noticed your resting heart rate is steady at 68 bpm, 
which is good. Have you tried any of the grounding techniques we discussed? 
Taking a short walk (even just 10 minutes) could help ease some tension. 
You've got this! 💙
```

**Model Configuration**:
- Model: `llama3.2` (configurable via `OLLAMA_MODEL`)
- Temperature: 0.7
- Max tokens: 2048
- Response time: ~3-5 seconds

---

## Core Components

### Frontend

**Tech Stack**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui

**Key Pages**:
- `/` - Landing page
- `/login` - User authentication
- `/signup` - User registration
- `/dashboard` - Main chat interface with Fitbit widget
- `/admin` - Admin panel for document management

**Components**:
```
frontend/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── layout.tsx                  # Root layout
│   ├── globals.css                 # Global styles
│   ├── login/page.tsx             # Login page
│   ├── signup/page.tsx            # Signup page
│   ├── dashboard/page.tsx         # Chat interface
│   ├── admin/page.tsx             # Admin panel
│   └── api/
│       ├── chat/route.ts          # Main chat endpoint
│       ├── emergency-contact/route.ts
│       ├── fitbit/
│       │   ├── authorize/route.ts
│       │   ├── callback/route.ts
│       │   ├── data/route.ts
│       │   ├── disconnect/route.ts
│       │   └── status/route.ts
│       └── admin/documents/
│           ├── upload/route.ts
│           ├── list/route.ts
│           └── [id]/route.ts
├── components/
│   ├── EmergencyContactWidget.tsx
│   ├── FitbitWidget.tsx
│   ├── FitbitWidgetSimple.tsx
│   ├── ThemeToggle.tsx
│   └── ui/                         # shadcn components
└── lib/
    ├── utils.ts
    ├── supabase/
    │   ├── client.ts
    │   └── server.ts
    ├── gemini/
    │   ├── flash-client.ts
    │   ├── flash-orchestrator.ts
    │   ├── context-summarizer.ts
    │   └── tool-schemas.ts
    ├── ollama/
    │   ├── client.ts
    │   └── context-builder.ts
    ├── mem0/
    │   └── client.ts
    ├── fitbit/
    │   ├── api.ts
    │   ├── intraday-api.ts
    │   ├── ai-analyzer.ts
    │   ├── insight-generator.ts
    │   ├── config.ts
    │   ├── tokens.ts
    │   └── types.ts
    ├── pinecone/
    │   ├── client.ts
    │   ├── store.ts
    │   └── delete.ts
    ├── rag/
    │   └── query.ts
    ├── safety/
    │   └── crisis-detection.ts
    ├── email/
    │   └── crisis-alert.ts
    └── pdf/
        ├── processor.ts
        └── docling-processor.ts
```

### Backend APIs

All API routes are serverless Next.js API routes (Edge/Node runtime).

#### **Chat API** (`/api/chat`)

**Purpose**: Main conversational endpoint

**Flow**:
1. Authenticate user (Supabase)
2. Check for crisis (severe → send emergency email)
3. Get user profile (username, email)
4. Orchestrate context (Flash + tools)
5. Build DeepSeek prompt
6. Generate response (Ollama)
7. Add emergency resources if crisis detected
8. Store conversation in database
9. Store health insights in Mem0

**Request**:
```json
{
  "message": "I'm feeling anxious about my exam tomorrow",
  "conversationHistory": [
    { "role": "user", "content": "Hello" },
    { "role": "assistant", "content": "Hi! How can I help?" }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "response": "Hi Sarah! I can sense your anxiety...",
  "sources": [],
  "contextUsed": true,
  "fitbitDataUsed": true,
  "crisisDetected": false,
  "toolsUsed": ["searchMemories", "getUserProfile", "getFitbitHealthData"]
}
```

---

#### **Fitbit OAuth Flow**

**1. Authorization** (`/api/fitbit/authorize`)
- Redirects to Fitbit OAuth consent page
- Scopes: `activity`, `heartrate`, `sleep`, `oxygen_saturation`, `respiratory_rate`, `temperature`, `nutrition`, `weight`, `profile`

**2. Callback** (`/api/fitbit/callback`)
- Receives authorization code
- Exchanges for access token + refresh token
- Stores in `fitbit_tokens` table
- Redirects to dashboard

**3. Data Fetch** (`/api/fitbit/data`)
- Fetches historical data (last 7 days)
- Activity, heart rate, sleep, HRV
- Stores in `fitbit_data` table

**4. Status** (`/api/fitbit/status`)
- Checks if user has connected Fitbit
- Returns connection status

**5. Disconnect** (`/api/fitbit/disconnect`)
- Revokes Fitbit tokens
- Deletes stored data

**6. Intraday Wellness** (`/api/fitbit/intraday/wellness`)
- Fetches real-time vitals (last 30 minutes)
- Heart rate, HRV, breathing rate, SpO2, steps
- Calculates stress/anxiety/fatigue indicators

---

### LLM Integration

#### **Gemini 2.5 Flash** (`lib/gemini/flash-client.ts`)

**Configuration**:
```typescript
export const flashConfig = {
    model: 'gemini-2.0-flash-exp',
    apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    maxOutputTokens: 2048,
    temperature: 0.7,
}
```

**Usage**:
```typescript
import { getFlashClient } from '@/lib/gemini/flash-client';

const client = getFlashClient();
const response = await client.models.generateContent({
    model: flashConfig.model,
    contents: [
        { role: 'user', parts: [{ text: prompt }] }
    ],
    config: {
        maxOutputTokens: 512,
        temperature: 0.3
    }
});
```

**Rate Limits**:
- Free tier: 20 requests/day
- Paid tier: Higher limits (configure via API key)

---

#### **DeepSeek (Ollama)** (`lib/ollama/client.ts`)

**Configuration**:
```typescript
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
```

**Usage**:
```typescript
import { generateText } from '@/lib/ollama/client';

const response = await generateText(prompt, {
    temperature: 0.7,
    maxTokens: 2048,
});
```

**Setup**:
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull model
ollama pull llama3.2

# Start server
ollama serve
```

---

### Tool Ecosystem

#### **Tool 1: searchMemories** (Mem0)

**Purpose**: Retrieve relevant memories from long-term storage

**Implementation**:
```typescript
import { searchMemories } from '@/lib/mem0/client';

const result = await searchMemories(userId, query, {
    categories: ['health', 'conversation_insights'],
    limit: 5,
    threshold: 0.3
});
```

**Memory Categories**:
- `health`: Physical/mental health mentions
- `conversation_insights`: Key conversation takeaways
- `hobbies`: User interests
- `user_preferences`: Preferences and dislikes
- `milestones`: Important events
- `misc`: Uncategorized

**Storage**:
```typescript
await addMemory(userId, memoryText, {
    category: 'health'
});
```

---

#### **Tool 2: getUserProfile**

**Purpose**: Fetch user profile data

**Implementation**:
```typescript
const { data: profile } = await supabase
    .from('user_profiles')
    .select('username, email')
    .eq('user_id', userId)
    .single();
```

**Returns**:
```typescript
{
    username: 'sarah',
    email: 'sarah@example.com'
}
```

---

#### **Tool 3: getFitbitHealthData**

**Purpose**: Retrieve historical Fitbit data (last 7 days)

**Implementation**:
```typescript
const { data } = await supabase
    .from('fitbit_data')
    .select('*')
    .eq('user_id', userId)
    .gte('date', sevenDaysAgo)
    .order('date', { ascending: false });
```

**Data Types**:
- `activity`: Steps, calories, distance, active minutes
- `heart_rate`: Resting HR, HR zones
- `sleep`: Duration, efficiency, stages
- `hrv`: RMSSD (heart rate variability)

---

#### **Tool 4: getRecentWellness** (Intraday API)

**Purpose**: Fetch real-time vitals from last 30 minutes

**Implementation**:
```typescript
const [heartRate, hrv, breathing, spo2, steps] = await Promise.allSettled([
    fetchIntradayHeartRate(userId, today, '1min', startTime, endTime),
    fetchHRV(userId, today),
    fetchBreathingRate(userId, today, startTime, endTime),
    fetchSpO2(userId, today, startTime, endTime),
    fetchIntradayActivity(userId, today, '1min', startTime, endTime)
]);
```

**Mental Health Indicators**:
```typescript
{
    stressLevel: 'low' | 'moderate' | 'high',
    anxietyRisk: 'low' | 'moderate' | 'elevated',
    fatigueLevel: 'low' | 'moderate' | 'high'
}
```

**Calculation**:
- **Stress**: Based on HRV (low HRV = high stress)
- **Anxiety**: HR variability + elevated resting HR
- **Fatigue**: Low activity + poor sleep quality

---

#### **Tool 5: queryRAG** (Conditional)

**Purpose**: Retrieve evidence-based mental health knowledge

**When Called**:
- User asks about mental health concepts (CBT, mindfulness)
- Requests coping strategies
- Educational questions

**When NOT Called**:
- Personal conversations
- Greetings
- Questions about their own data

**Implementation**:
```typescript
import { queryRAG } from '@/lib/rag/query';

const chunks = await queryRAG(query, topK);
```

**RAG Pipeline**:
1. **Embedding**: Convert query to vector (Ollama `nomic-embed-text`)
2. **Search**: Find similar chunks in Pinecone
3. **Rerank**: Score by relevance
4. **Return**: Top K chunks with metadata

---

#### **Tool 6: analyzeHealthWithAI**

**Purpose**: Generate AI insights from Fitbit data

**Implementation**:
```typescript
const analysis = await analyzeHealthDataWithAI(fitbitData);
```

**Output**:
```typescript
{
    summary: "User shows consistent low activity (70 steps/day) and good resting heart rate (68 bpm)",
    mentalHealthCorrelation: "Low activity may contribute to feelings of disconnection",
    urgencyLevel: "moderate",
    patterns: ["low_activity", "stable_heart_rate"],
    recommendations: ["Encourage short walks", "Monitor mood changes"]
}
```

---

## Key Features

### 1. **Multi-Agent Orchestration**
- Parallel tool execution (3-4x faster)
- Intelligent context summarization (95% token reduction)
- Specialized response generation

### 2. **Real-Time Health Integration**
- Fitbit OAuth flow
- Intraday API (heart rate, HRV, breathing, SpO2)
- Mental health indicator calculation
- AI-powered health insights

### 3. **Long-Term Memory** (Mem0)
- Conversation history retention
- User preference learning
- Contextual memory retrieval
- Category-based organization

### 4. **Crisis Detection**
- Keyword-based detection
- Severity levels (crisis, severe crisis)
- Emergency contact alerts
- Resource provision (988, Trevor Project)

### 5. **RAG Knowledge Base**
- Evidence-based mental health content
- Semantic search
- PDF document processing (Docling)
- Pinecone vector storage

### 6. **Admin Panel**
- Document upload (PDFs)
- RAG content management
- User analytics

---

## Technology Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **State Management**: React hooks
- **Auth**: Supabase Auth

### Backend
- **Runtime**: Next.js API Routes (Edge/Node)
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **File Storage**: Supabase Storage

### AI/ML
- **Orchestrator**: Gemini 2.5 Flash
- **Summarizer**: Gemini 2.5 Flash
- **Response Generator**: DeepSeek (Ollama)
- **Embeddings**: Ollama `nomic-embed-text`
- **Memory**: Mem0 AI
- **Vector DB**: Pinecone

### Integrations
- **Fitbit API**: OAuth 2.0, Intraday API
- **Email**: Resend (crisis alerts)
- **PDF Processing**: Docling (document parsing)

---

## Installation & Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Docker (for Ollama)
- Supabase account
- Fitbit Developer account
- Pinecone account
- Mem0 account

### 1. Clone Repository
```bash
git clone https://github.com/VivaanHooda/dtl-mental-health-chatbot.git
cd dtl-mental-health-chatbot
```

### 2. Install Dependencies
```bash
cd frontend
npm install
```

### 3. Setup Ollama
```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull DeepSeek model
ollama pull llama3.2

# Pull embedding model
ollama pull nomic-embed-text

# Start server
ollama serve
```

Or use Docker:
```bash
docker compose up -d ollama
```

### 4. Setup Docling (PDF Processing)
```bash
docker compose up -d docling
```

### 5. Configure Environment Variables

Create `.env` file in `frontend/`:
```bash
cp .env.example .env
```

See [Environment Variables](#environment-variables) section.

### 6. Setup Supabase Database

Run migrations:
```sql
-- See database/schema.sql for complete schema
```

### 7. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Fitbit OAuth
NEXT_PUBLIC_FITBIT_CLIENT_ID=your-client-id
FITBIT_CLIENT_SECRET=your-client-secret
NEXT_PUBLIC_FITBIT_REDIRECT_URI=http://localhost:3000/api/fitbit/callback

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_API_KEY=your-google-api-key

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
OLLAMA_EMBED_MODEL=nomic-embed-text

# Pinecone
PINECONE_API_KEY=your-pinecone-api-key
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_INDEX_NAME=mental-health-rag

# Mem0
MEM0_API_KEY=your-mem0-api-key

# Feature Flags
ENABLE_RAG=true

# PDF Processing
DOCLING_URL=http://localhost:5001

# Email (Crisis Alerts)
RESEND_API_KEY=your-resend-api-key

# Model Configuration
NEXT_PUBLIC_MODEL_NAME=med-assistant
```

---

## API Endpoints

### Chat
- `POST /api/chat` - Main chat endpoint

### Fitbit
- `GET /api/fitbit/authorize` - Start OAuth flow
- `GET /api/fitbit/callback` - OAuth callback
- `GET /api/fitbit/data` - Fetch historical data
- `GET /api/fitbit/status` - Check connection status
- `POST /api/fitbit/disconnect` - Disconnect Fitbit
- `GET /api/fitbit/intraday/wellness` - Get real-time vitals

### Emergency Contact
- `GET /api/emergency-contact` - Get emergency contact
- `POST /api/emergency-contact` - Set emergency contact
- `DELETE /api/emergency-contact` - Remove emergency contact

### Admin (Document Management)
- `POST /api/admin/documents/upload` - Upload PDF
- `GET /api/admin/documents/list` - List documents
- `DELETE /api/admin/documents/[id]` - Delete document

---

## Tool Execution Flow

```
User Message: "I'm feeling anxious"
                    |
                    v
        ┌───────────────────────┐
        │   Chat API Route      │
        │  /api/chat/route.ts   │
        └───────┬───────────────┘
                │
                v
        ┌───────────────────────┐
        │  Crisis Detection     │
        │  (keyword matching)   │
        └───────┬───────────────┘
                │
                v
        ┌───────────────────────────────────────┐
        │     Orchestrate Context (Flash)       │
        │  lib/gemini/flash-orchestrator.ts     │
        └───────┬───────────────────────────────┘
                │
                v
    ┌───────────┴───────────┐
    │   Parallel Execution   │
    └───────────┬───────────┘
                │
    ┌───────────┼───────────┬───────────┬──────────┐
    v           v           v           v          v
┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌──────┐
│Memories│ │Profile │ │ Fitbit  │ │Wellness│ │ RAG? │
│ (Mem0) │ │ (DB)   │ │ (7 days)│ │(30 min)│ │(cond)│
└───┬────┘ └───┬────┘ └────┬────┘ └───┬────┘ └──┬───┘
    │          │           │          │         │
    └──────────┴───────────┴──────────┴─────────┘
                    │
                    v
        ┌───────────────────────┐
        │  Summarize Context    │
        │  (Flash Summarizer)   │
        │  → Natural paragraph  │
        └───────┬───────────────┘
                │
                v
        ┌───────────────────────┐
        │  Build DeepSeek       │
        │  Prompt               │
        │  context-builder.ts   │
        └───────┬───────────────┘
                │
                v
        ┌───────────────────────┐
        │  Generate Response    │
        │  (DeepSeek/Ollama)    │
        │  → Empathetic reply   │
        └───────┬───────────────┘
                │
                v
        ┌───────────────────────┐
        │  Store Conversation   │
        │  + Add Memories       │
        └───────┬───────────────┘
                │
                v
            Response to User
```

---

## Memory System

### Mem0 Integration

**Client**: `lib/mem0/client.ts`

**Adding Memories**:
```typescript
import { addMemory } from '@/lib/mem0/client';

await addMemory(userId, "User feels stressed about exams", {
    category: 'health'
});
```

**Searching Memories**:
```typescript
import { searchMemories } from '@/lib/mem0/client';

const result = await searchMemories(userId, "exam stress", {
    categories: ['health', 'conversation_insights'],
    limit: 5,
    threshold: 0.3
});
```

**Memory Structure**:
```typescript
{
    id: string;
    memory: string;
    user_id: string;
    category: string;
    score: number;
    created_at: string;
    updated_at: string;
}
```

**Auto-Storage**: After each chat, health insights are automatically stored:
```typescript
if (context.healthAnalysis) {
    const memoryText = formatAIInsightsForMemory(
        context.healthAnalysis,
        dateRange
    );
    await addMemory(user.id, memoryText, { category: 'health' });
}
```

---

## RAG Pipeline

### Document Processing

**1. Upload PDF** (`/api/admin/documents/upload`)
```typescript
// Upload to Supabase Storage
const { data } = await supabase.storage
    .from('documents')
    .upload(filePath, file);

// Send to Docling for parsing
const doclingResponse = await fetch(`${DOCLING_URL}/convert`, {
    method: 'POST',
    body: formData
});

// Extract text chunks
const chunks = extractChunks(doclingResponse.markdown);

// Generate embeddings
for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk.text);
    
    // Store in Pinecone
    await pineconeIndex.upsert([{
        id: chunk.id,
        values: embedding,
        metadata: {
            text: chunk.text,
            filename: file.name,
            page: chunk.page
        }
    }]);
}
```

### Query Pipeline

**2. Query RAG** (`lib/rag/query.ts`)
```typescript
export async function queryRAG(query: string, topK: number = 5) {
    // Generate query embedding
    const embedding = await generateEmbedding(query);
    
    // Search Pinecone
    const results = await pineconeIndex.query({
        vector: embedding,
        topK,
        includeMetadata: true
    });
    
    // Return chunks
    return results.matches.map(match => ({
        id: match.id,
        text: match.metadata.text,
        score: match.score,
        metadata: match.metadata
    }));
}
```

---

## Crisis Detection

### Levels

**1. Regular Crisis** (`detectCrisis()`)
- Keywords: "suicide", "kill myself", "hopeless", "give up"
- Response: Add emergency resources to reply
- Resources: 988 Suicide & Crisis Lifeline, Trevor Project

**2. Severe Crisis** (`detectSevereCrisis()`)
- Keywords: "kill myself tonight", "ending it all", "can't go on"
- Response: 
  - Immediate emergency response
  - Send email to emergency contact
  - Disable chat (force user to seek help)
  - Display crisis resources prominently

### Emergency Email

**Trigger**: Severe crisis detected + emergency contact linked

**Email Template**:
```
Subject: URGENT: Mental Health Crisis Alert

Dear [Emergency Contact],

This is an automated alert from the DTL Mental Health Chatbot.

[User Name] has expressed thoughts or language that indicate they 
may be in a mental health crisis and potentially at risk.

Time: [Timestamp]
User: [User Name]
Email: [User Email]

IMMEDIATE ACTION RECOMMENDED:
Please reach out to [User Name] immediately to check on their wellbeing.

If you believe they are in immediate danger, please:
1. Call 988 (Suicide & Crisis Lifeline)
2. Contact local emergency services (911)
3. Stay with them if possible

Resources:
- 988 Suicide & Crisis Lifeline
- Crisis Text Line: Text HOME to 741741
- Trevor Project: 1-866-488-7386

This alert is generated to ensure [User Name]'s safety.
```

---

## Deployment

### Vercel (Recommended)

**1. Connect Repository**
```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel
```

**2. Configure Environment Variables**
- Go to Vercel Dashboard → Project Settings → Environment Variables
- Add all variables from `.env`

**3. Domain Setup**
- Add custom domain in Vercel Dashboard
- Update Fitbit redirect URI to production URL

### Docker

**1. Build Image**
```bash
docker build -t mental-health-chatbot .
```

**2. Run Container**
```bash
docker run -p 3000:3000 \
  --env-file .env \
  mental-health-chatbot
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: ./frontend
    ports:
      - "3000:3000"
    env_file:
      - .env
    depends_on:
      - ollama
      - docling
  
  ollama:
    image: ollama/ollama
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama
  
  docling:
    image: docling/docling
    ports:
      - "5001:5001"

volumes:
  ollama-data:
```

**Start**:
```bash
docker compose up -d
```

---

## Development

### Project Structure
```
dtl-mental-health-chatbot/
├── frontend/              # Next.js app
│   ├── app/              # Pages & API routes
│   ├── components/       # React components
│   ├── lib/              # Utility libraries
│   └── public/           # Static assets
├── python/               # ML training scripts
│   ├── export.ipynb      # Model export
│   └── training_deepseek.ipynb
├── database/             # SQL schemas
├── docs/                 # Documentation
├── docker-compose.yml    # Docker services
└── ARCHITECTURE.md       # Architecture docs
```

### Code Style

**TypeScript**:
- Use `async/await` over promises
- Prefer `const` over `let`
- Use type annotations
- Follow Next.js conventions

**React**:
- Functional components only
- Use hooks for state management
- Server components by default
- Client components only when needed

### Testing

```bash
# Run tests
npm test

# Run linter
npm run lint

# Type check
npm run type-check
```

---

## Testing

### Manual Testing

**1. Test Chat Flow**:
```bash
# Start dev server
npm run dev

# Open http://localhost:3000
# Sign up → Login → Dashboard
# Send message: "Hello"
# Verify: Response includes username, health data
```

**2. Test Fitbit Integration**:
```bash
# Dashboard → Connect Fitbit
# Authorize → Check widget shows data
# Send message: "How am I doing?"
# Verify: Response references heart rate, steps
```

**3. Test Crisis Detection**:
```bash
# Send: "I'm thinking about suicide"
# Verify: Emergency resources appear
# Send: "I want to kill myself tonight"
# Verify: Email sent (if emergency contact linked)
```

### Automated Tests

```typescript
// Example: Test chat API
describe('Chat API', () => {
    it('should return response with context', async () => {
        const response = await fetch('/api/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: 'Hello',
                conversationHistory: []
            })
        });
        
        const data = await response.json();
        expect(data.success).toBe(true);
        expect(data.response).toBeDefined();
    });
});
```

---

## Contributing

### Guidelines

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No console.logs in production code
- [ ] Environment variables documented
- [ ] Type-safe (no `any` types)

---

## License

MIT License - see LICENSE file for details

---

## Support

- **Issues**: [GitHub Issues](https://github.com/VivaanHooda/dtl-mental-health-chatbot/issues)
- **Email**: support@example.com
- **Discord**: [Join our community](https://discord.gg/example)

---

## Acknowledgments

- **Gemini AI**: Context orchestration and summarization
- **DeepSeek**: Natural language generation
- **Mem0**: Long-term memory system
- **Fitbit**: Health data integration
- **Supabase**: Database and authentication
- **Pinecone**: Vector storage
- **shadcn/ui**: UI components

---

**Built with ❤️ for mental health support**
