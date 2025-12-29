# System Architecture Diagrams

> **Mermaid.js Diagrams** for DTL Mental Health Chatbot  
> Visualizations of multi-agent orchestration, data flow, and system components

---

## Table of Contents

- [Overview Architecture](#overview-architecture)
- [Multi-Agent Orchestration Flow](#multi-agent-orchestration-flow)
- [Three-Stage Pipeline](#three-stage-pipeline)
- [Tool Execution Sequence](#tool-execution-sequence)
- [Fitbit Integration Flow](#fitbit-integration-flow)
- [Memory System Architecture](#memory-system-architecture)
- [RAG Pipeline](#rag-pipeline)
- [Crisis Detection Flow](#crisis-detection-flow)
- [Database Schema](#database-schema)
- [Authentication Flow](#authentication-flow)
- [Component Hierarchy](#component-hierarchy)
- [Deployment Architecture](#deployment-architecture)

---

## Overview Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        UI[Next.js UI<br/>Dashboard, Chat Interface]
        Components[React Components<br/>FitbitWidget, Chat]
    end
    
    subgraph "API Layer"
        ChatAPI[Chat API<br/>/api/chat]
        FitbitAPI[Fitbit APIs<br/>/api/fitbit/*]
        AdminAPI[Admin APIs<br/>/api/admin/*]
    end
    
    subgraph "AI Orchestration Layer"
        Flash1[Gemini Flash<br/>Tool Orchestrator]
        Flash2[Gemini Flash<br/>Context Summarizer]
        DeepSeek[DeepSeek/Ollama<br/>Response Generator]
    end
    
    subgraph "Tool Layer"
        Mem0[Mem0 AI<br/>Memory System]
        Fitbit[Fitbit API<br/>Health Data]
        RAG[RAG System<br/>Pinecone + Embeddings]
        Profile[User Profile<br/>Supabase DB]
    end
    
    subgraph "Data Layer"
        DB[(Supabase<br/>PostgreSQL)]
        Vector[(Pinecone<br/>Vector DB)]
        Storage[Supabase<br/>Storage]
    end
    
    UI --> ChatAPI
    UI --> FitbitAPI
    UI --> AdminAPI
    
    ChatAPI --> Flash1
    Flash1 --> Mem0
    Flash1 --> Fitbit
    Flash1 --> RAG
    Flash1 --> Profile
    
    Flash1 --> Flash2
    Flash2 --> DeepSeek
    
    FitbitAPI --> Fitbit
    FitbitAPI --> DB
    
    Mem0 --> Vector
    RAG --> Vector
    Profile --> DB
    AdminAPI --> Storage
    AdminAPI --> Vector
    
    style Flash1 fill:#4285f4
    style Flash2 fill:#4285f4
    style DeepSeek fill:#ea4335
    style Mem0 fill:#34a853
    style RAG fill:#fbbc04
```

---

## Multi-Agent Orchestration Flow

```mermaid
sequenceDiagram
    participant User
    participant ChatAPI as Chat API<br/>/api/chat
    participant Crisis as Crisis<br/>Detection
    participant Orchestrator as Gemini Flash<br/>Orchestrator
    participant Tools as Tool Layer
    participant Summarizer as Gemini Flash<br/>Summarizer
    participant DeepSeek as DeepSeek<br/>Ollama
    participant DB as Database
    
    User->>ChatAPI: Send message
    ChatAPI->>Crisis: Check for crisis keywords
    
    alt Severe Crisis
        Crisis-->>ChatAPI: Severe crisis detected
        ChatAPI->>DB: Send emergency email
        ChatAPI-->>User: Emergency resources + disable chat
    else Regular Crisis or Safe
        ChatAPI->>Orchestrator: Orchestrate context
        
        par Parallel Tool Execution
            Orchestrator->>Tools: searchMemories(userId, query)
            Orchestrator->>Tools: getUserProfile(userId)
            Orchestrator->>Tools: getFitbitHealthData(userId, 7 days)
            Orchestrator->>Tools: getRecentWellness(userId, 30 min)
            Orchestrator->>Tools: shouldCallRAG(message) → decision
        end
        
        Tools-->>Orchestrator: Raw context data
        
        Orchestrator->>Summarizer: Summarize context<br/>(raw → paragraph)
        Summarizer-->>Orchestrator: Natural language summary<br/>"Sarah has 68 bpm HR, feels stressed..."
        
        Orchestrator->>DeepSeek: Build prompt + summarized context
        DeepSeek-->>Orchestrator: Empathetic response
        
        Orchestrator-->>ChatAPI: Response + metadata
        ChatAPI->>DB: Store conversation
        ChatAPI->>Tools: Store health insights in Mem0
        ChatAPI-->>User: Final response
    end
```

---

## Three-Stage Pipeline

```mermaid
flowchart TD
    Start([User Message]) --> Stage1
    
    subgraph Stage1["Stage 1: Tool Orchestration<br/>(Gemini 2.5 Flash)"]
        Analyze[Analyze user intent]
        Decision{RAG needed?}
        ParallelExec[Execute tools in parallel]
        
        Analyze --> Decision
        Decision -->|Yes - Educational query| ParallelExec
        Decision -->|No - Personal chat| ParallelExec
        
        ParallelExec --> T1[searchMemories]
        ParallelExec --> T2[getUserProfile]
        ParallelExec --> T3[getFitbitHealthData]
        ParallelExec --> T4[getRecentWellness]
        ParallelExec --> T5[queryRAG - conditional]
        ParallelExec --> T6[analyzeHealthWithAI]
        
        T1 --> RawContext[Raw Context Data<br/>~2000-4000 tokens]
        T2 --> RawContext
        T3 --> RawContext
        T4 --> RawContext
        T5 --> RawContext
        T6 --> RawContext
    end
    
    RawContext --> Stage2
    
    subgraph Stage2["Stage 2: Context Summarization<br/>(Gemini 2.5 Flash)"]
        SysPrompt[SUMMARIZER_SYSTEM_PROMPT:<br/>Create natural paragraph]
        BuildContext[Format raw data]
        FlashSummarize[Flash API call]
        Summary[Summarized Context<br/>~50-80 tokens<br/>95% reduction]
        
        SysPrompt --> FlashSummarize
        BuildContext --> FlashSummarize
        FlashSummarize --> Summary
    end
    
    Summary --> Stage3
    
    subgraph Stage3["Stage 3: Response Generation<br/>(DeepSeek via Ollama)"]
        BuildPrompt[Build DeepSeek prompt]
        OllamaCall[Ollama API call<br/>llama3.2 model]
        Response[Warm, empathetic<br/>response<br/><100 words]
        
        BuildPrompt --> OllamaCall
        OllamaCall --> Response
    end
    
    Response --> End([User receives response])
    
    style Stage1 fill:#4285f4,color:#fff
    style Stage2 fill:#34a853,color:#fff
    style Stage3 fill:#ea4335,color:#fff
    style Summary fill:#fbbc04
```

---

## Tool Execution Sequence

```mermaid
sequenceDiagram
    participant Orchestrator
    participant Mem0
    participant ProfileDB as User Profile DB
    participant FitbitDB as Fitbit DB
    participant FitbitAPI as Fitbit Intraday API
    participant RAGDecision as RAG Decision Logic
    participant Pinecone
    
    Note over Orchestrator: Start parallel execution
    
    par Tool 1: Memories
        Orchestrator->>Mem0: searchMemories(userId, query)
        Mem0->>Mem0: Generate query embedding
        Mem0->>Mem0: Search vector DB
        Mem0-->>Orchestrator: 5 relevant memories<br/>with scores
    and Tool 2: Profile
        Orchestrator->>ProfileDB: SELECT username, email<br/>WHERE user_id = ?
        ProfileDB-->>Orchestrator: { username: "sarah" }
    and Tool 3: Fitbit Historical
        Orchestrator->>FitbitDB: SELECT * FROM fitbit_data<br/>WHERE user_id = ?<br/>AND date >= 7 days ago
        FitbitDB-->>Orchestrator: Activity, HR, sleep data<br/>Last 7 days
    and Tool 4: Recent Wellness
        Orchestrator->>FitbitAPI: GET intraday/heartrate
        Orchestrator->>FitbitAPI: GET intraday/hrv
        Orchestrator->>FitbitAPI: GET intraday/breathing
        Orchestrator->>FitbitAPI: GET intraday/spo2
        Orchestrator->>FitbitAPI: GET intraday/steps
        FitbitAPI-->>Orchestrator: Last 30 min vitals<br/>+ mental health indicators
    and Tool 5: RAG Decision
        Orchestrator->>RAGDecision: shouldCallRAG(message, history)
        RAGDecision->>RAGDecision: Analyze intent<br/>Educational vs Personal
        RAGDecision-->>Orchestrator: true/false
        
        alt RAG Needed
            Orchestrator->>Pinecone: queryRAG(query, topK=5)
            Pinecone->>Pinecone: Generate embedding
            Pinecone->>Pinecone: Vector search
            Pinecone-->>Orchestrator: Top 5 knowledge chunks
        end
    end
    
    Note over Orchestrator: All tools complete<br/>Total time: ~2-3 seconds
```

---

## Fitbit Integration Flow

```mermaid
graph TD
    Start([User clicks<br/>'Connect Fitbit']) --> Authorize
    
    Authorize["/api/fitbit/authorize<br/>Redirect to Fitbit OAuth"]
    Authorize --> FitbitConsent{User authorizes?}
    
    FitbitConsent -->|Yes| Callback["/api/fitbit/callback<br/>Receive auth code"]
    FitbitConsent -->|No| Cancel([User cancels])
    
    Callback --> Exchange["Exchange code<br/>for access token<br/>+ refresh token"]
    Exchange --> StoreTokens[(Store in<br/>fitbit_tokens table)]
    
    StoreTokens --> FetchData["/api/fitbit/data<br/>Fetch historical data"]
    
    FetchData --> Par1{Parallel requests}
    Par1 --> Activity["GET /activities/date/{date}.json"]
    Par1 --> Heart["GET /activities/heart/date/{date}/7d.json"]
    Par1 --> Sleep["GET /sleep/date/{date}.json"]
    Par1 --> HRV["GET /hrv/date/{date}.json"]
    
    Activity --> StoreDB[(Store in<br/>fitbit_data table)]
    Heart --> StoreDB
    Sleep --> StoreDB
    HRV --> StoreDB
    
    StoreDB --> Redirect([Redirect to<br/>dashboard])
    
    Redirect --> Widget[FitbitWidget<br/>displays data]
    
    Widget --> Intraday{User sends<br/>chat message?}
    Intraday -->|Yes| IntradayAPI["/api/fitbit/intraday/wellness<br/>Get real-time vitals"]
    
    IntradayAPI --> Par2{Parallel intraday}
    Par2 --> IntradayHR["GET /activities/heart/date/{date}/1d/1min/time/{start}/{end}.json"]
    Par2 --> IntradayHRV["GET /hrv/date/{date}.json"]
    Par2 --> IntradayBreath["GET /br/date/{date}/all.json"]
    Par2 --> IntradaySpO2["GET /spo2/date/{date}/all.json"]
    Par2 --> IntradaySteps["GET /activities/steps/date/{date}/1d/1min/time/{start}/{end}.json"]
    
    IntradayHR --> Calculate[Calculate mental<br/>health indicators]
    IntradayHRV --> Calculate
    IntradayBreath --> Calculate
    IntradaySpO2 --> Calculate
    IntradaySteps --> Calculate
    
    Calculate --> Indicators["stressLevel: low/moderate/high<br/>anxietyRisk: low/moderate/elevated<br/>fatigueLevel: low/moderate/high"]
    
    Indicators --> Chat([Used in chat<br/>context])
    
    style StoreTokens fill:#4285f4
    style StoreDB fill:#34a853
    style Calculate fill:#fbbc04
```

---

## Memory System Architecture

```mermaid
graph TB
    subgraph "Memory Addition Flow"
        ChatResponse[Chat Response<br/>Generated]
        Extract[Extract key insights]
        Format[formatAIInsightsForMemory]
        AddAPI[Mem0 addMemory API]
        
        ChatResponse --> Extract
        Extract --> Format
        Format --> AddAPI
    end
    
    subgraph "Mem0 Processing"
        AddAPI --> Mem0Backend[Mem0 Backend]
        Mem0Backend --> Embedding[Generate embedding<br/>using Mem0's model]
        Embedding --> Store[(Store in<br/>Mem0 Vector DB)]
        Store --> Categorize[Auto-categorize:<br/>health, insights, etc.]
    end
    
    subgraph "Memory Retrieval Flow"
        UserMessage[User Message]
        SearchAPI[Mem0 searchMemories API]
        QueryEmbed[Generate query<br/>embedding]
        VectorSearch[Vector similarity<br/>search]
        Rerank[Rerank by relevance]
        TopK[Return top 5<br/>memories]
        
        UserMessage --> SearchAPI
        SearchAPI --> QueryEmbed
        QueryEmbed --> VectorSearch
        VectorSearch --> Rerank
        Rerank --> TopK
    end
    
    Store -.->|Retrieve| VectorSearch
    TopK --> Context[Add to chat<br/>context]
    
    subgraph "Memory Categories"
        Cat1[health]
        Cat2[conversation_insights]
        Cat3[hobbies]
        Cat4[user_preferences]
        Cat5[milestones]
        Cat6[misc]
    end
    
    Categorize --> Cat1
    Categorize --> Cat2
    Categorize --> Cat3
    Categorize --> Cat4
    Categorize --> Cat5
    Categorize --> Cat6
    
    style Mem0Backend fill:#34a853
    style Store fill:#4285f4
    style TopK fill:#fbbc04
```

---

## RAG Pipeline

```mermaid
flowchart TD
    subgraph "Document Ingestion Pipeline"
        Upload[Admin uploads PDF<br/>/api/admin/documents/upload]
        Storage[(Supabase Storage<br/>documents bucket)]
        Docling[Docling Service<br/>localhost:5001]
        Parse[Parse PDF<br/>Extract text + structure]
        Chunk[Chunk text<br/>~500 tokens each]
        
        Upload --> Storage
        Storage --> Docling
        Docling --> Parse
        Parse --> Chunk
    end
    
    subgraph "Embedding & Indexing"
        Chunk --> EmbedLoop{For each chunk}
        EmbedLoop --> Ollama[Ollama Embedding<br/>nomic-embed-text]
        Ollama --> Vector[Generate 768-dim<br/>vector]
        Vector --> Upsert[Upsert to Pinecone<br/>with metadata]
        Upsert --> PineconeDB[(Pinecone Index<br/>mental-health-rag)]
        Upsert --> EmbedLoop
    end
    
    subgraph "Query Pipeline"
        UserQuery[User message:<br/>'What is CBT?']
        RAGDecision{RAG needed?<br/>Flash decision}
        
        UserQuery --> RAGDecision
        RAGDecision -->|No - Personal chat| Skip([Skip RAG])
        RAGDecision -->|Yes - Educational| QueryEmbed[Generate query<br/>embedding]
        
        QueryEmbed --> Ollama2[Ollama Embedding<br/>nomic-embed-text]
        Ollama2 --> QueryVector[Query vector<br/>768 dimensions]
        QueryVector --> Search[Pinecone<br/>vector search]
        
        Search --> PineconeDB
        PineconeDB --> Results[Top K results<br/>with similarity scores]
        Results --> Filter[Filter by threshold<br/>score > 0.7]
        Filter --> Return[Return chunks<br/>with metadata]
    end
    
    Return --> ChatContext[Add to chat<br/>context]
    
    style Docling fill:#ea4335
    style Ollama fill:#4285f4
    style Ollama2 fill:#4285f4
    style PineconeDB fill:#fbbc04
```

---

## Crisis Detection Flow

```mermaid
flowchart TD
    Message[User Message] --> DetectRegular{detectCrisis<br/>Check keywords}
    
    DetectRegular -->|"suicide", "hopeless"| RegularCrisis[Regular Crisis Flag]
    DetectRegular -->|Safe| DetectSevere{detectSevereCrisis<br/>Check severe keywords}
    
    DetectSevere -->|"kill myself tonight"<br/>"ending it all"| SevereCrisis[Severe Crisis Flag]
    DetectSevere -->|Safe| Continue[Continue normal<br/>chat flow]
    
    SevereCrisis --> CheckContact{Emergency<br/>contact linked?}
    
    CheckContact -->|Yes| SendEmail[Send emergency email<br/>via Resend API]
    CheckContact -->|No| SkipEmail[Skip email]
    
    SendEmail --> EmailContent["Email includes:<br/>- User name<br/>- Timestamp<br/>- Warning message<br/>- 988 hotline<br/>- Crisis resources"]
    
    EmailContent --> DisableChat[Disable chat input]
    SkipEmail --> DisableChat
    
    DisableChat --> ShowResources["Display prominent<br/>crisis resources:<br/>- 988 Lifeline<br/>- Crisis Text Line<br/>- Trevor Project"]
    
    ShowResources --> StopFlow([End chat session])
    
    RegularCrisis --> ContinueWithResources[Continue chat flow]
    ContinueWithResources --> AddResources[Append emergency<br/>resources to response]
    AddResources --> NormalResponse([Send response<br/>with resources])
    
    Continue --> NormalFlow([Normal chat response])
    
    style SevereCrisis fill:#ea4335,color:#fff
    style SendEmail fill:#fbbc04
    style RegularCrisis fill:#ff9800
```

---

## Database Schema

```mermaid
erDiagram
    users ||--o{ user_profiles : has
    users ||--o{ chat_messages : sends
    users ||--o{ fitbit_tokens : has
    users ||--o{ fitbit_data : generates
    
    users {
        uuid id PK
        string email
        timestamp created_at
    }
    
    user_profiles {
        uuid id PK
        uuid user_id FK
        string username
        string email
        string role
        timestamp created_at
    }
    
    chat_messages {
        uuid id PK
        uuid user_id FK
        string role
        text content
        timestamp created_at
    }
    
    fitbit_tokens {
        uuid id PK
        uuid user_id FK
        string fitbit_user_id
        string access_token
        string refresh_token
        timestamp expires_at
        string scope
        timestamp created_at
    }
    
    fitbit_data {
        uuid id PK
        uuid user_id FK
        string fitbit_user_id
        date date
        string type
        jsonb data
        timestamp created_at
    }
    
    emergency_contacts {
        uuid id PK
        uuid user_id FK
        string contact_name
        string contact_email
        string contact_phone
        string relationship
        timestamp created_at
    }
    
    users ||--o{ emergency_contacts : has
```

---

## Authentication Flow

```mermaid
sequenceDiagram
    participant User
    participant SignupPage as Signup Page
    participant SupabaseAuth as Supabase Auth
    participant Database as Database
    participant LoginPage as Login Page
    participant Dashboard
    
    rect rgb(200, 220, 250)
        Note over User,Database: Signup Flow
        User->>SignupPage: Enter email, password, username
        SignupPage->>SupabaseAuth: signUp(email, password)
        SupabaseAuth-->>SignupPage: User created (confirmation email sent)
        SignupPage->>Database: INSERT INTO user_profiles<br/>(user_id, username, email, role='student')
        Database-->>SignupPage: Profile created
        SignupPage-->>User: Success message<br/>"Check email for verification"
    end
    
    rect rgb(220, 250, 220)
        Note over User,Dashboard: Login Flow
        User->>LoginPage: Enter email, password
        LoginPage->>SupabaseAuth: signInWithPassword(email, password)
        SupabaseAuth-->>LoginPage: Session created
        LoginPage->>Database: Check if profile exists
        
        alt Profile exists
            Database-->>LoginPage: Profile found
            LoginPage-->>User: Redirect to /dashboard
        else No profile
            LoginPage->>Database: Create profile
            Database-->>LoginPage: Profile created
            LoginPage-->>User: Redirect to /dashboard
        end
    end
    
    rect rgb(250, 220, 220)
        Note over User,Dashboard: Protected Route Access
        User->>Dashboard: Visit /dashboard
        Dashboard->>SupabaseAuth: getUser()
        
        alt Authenticated
            SupabaseAuth-->>Dashboard: User session valid
            Dashboard-->>User: Show dashboard
        else Not authenticated
            SupabaseAuth-->>Dashboard: No session
            Dashboard-->>User: Redirect to /login
        end
    end
```

---

## Component Hierarchy

```mermaid
graph TD
    RootLayout[app/layout.tsx<br/>Root Layout]
    
    RootLayout --> HomePage[app/page.tsx<br/>Landing Page]
    RootLayout --> LoginPage[app/login/page.tsx]
    RootLayout --> SignupPage[app/signup/page.tsx]
    RootLayout --> DashboardPage[app/dashboard/page.tsx]
    RootLayout --> AdminPage[app/admin/page.tsx]
    
    DashboardPage --> ChatInterface[Chat Interface<br/>Message List + Input]
    DashboardPage --> FitbitWidget[FitbitWidget.tsx<br/>Health Data Display]
    DashboardPage --> EmergencyWidget[EmergencyContactWidget.tsx]
    
    FitbitWidget --> ConnectButton[Connect Fitbit Button]
    FitbitWidget --> HealthMetrics[Health Metrics Display<br/>Steps, HR, Sleep]
    
    EmergencyWidget --> ContactForm[Emergency Contact Form]
    
    AdminPage --> DocumentUpload[Document Upload Form]
    AdminPage --> DocumentList[Document List Table]
    
    ChatInterface --> MessageBubble[Message Bubble Component]
    ChatInterface --> InputField[Text Input + Send Button]
    ChatInterface --> LoadingIndicator[Loading Spinner]
    
    style DashboardPage fill:#4285f4,color:#fff
    style FitbitWidget fill:#34a853,color:#fff
    style AdminPage fill:#fbbc04
```

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        Mobile[Mobile Browser]
    end
    
    subgraph "CDN & Edge"
        Vercel[Vercel Edge Network<br/>CDN + Edge Functions]
    end
    
    subgraph "Application Layer"
        NextJS[Next.js App<br/>SSR + API Routes]
        StaticAssets[Static Assets<br/>JS, CSS, Images]
    end
    
    subgraph "AI Services"
        Gemini[Google Gemini API<br/>ai.google.dev]
        Ollama[Ollama<br/>Self-hosted or Cloud]
        Mem0Service[Mem0 API<br/>mem0.ai]
    end
    
    subgraph "External APIs"
        FitbitService[Fitbit API<br/>api.fitbit.com]
        Resend[Resend Email API<br/>resend.com]
    end
    
    subgraph "Data Layer"
        Supabase[Supabase<br/>Database + Auth + Storage]
        Pinecone[Pinecone<br/>Vector Database]
    end
    
    subgraph "Document Processing"
        DoclingService[Docling Service<br/>Docker Container]
    end
    
    Browser --> Vercel
    Mobile --> Vercel
    Vercel --> NextJS
    Vercel --> StaticAssets
    
    NextJS --> Gemini
    NextJS --> Ollama
    NextJS --> Mem0Service
    NextJS --> FitbitService
    NextJS --> Resend
    NextJS --> Supabase
    NextJS --> Pinecone
    NextJS --> DoclingService
    
    style Vercel fill:#000,color:#fff
    style Supabase fill:#3ecf8e
    style Gemini fill:#4285f4,color:#fff
    style Ollama fill:#ea4335,color:#fff
```

---

## Response Time Breakdown

```mermaid
gantt
    title Chat Request Timeline (Typical 10-12 second response)
    dateFormat X
    axisFormat %Ls
    
    section Auth & Validation
    Auth check           :0, 200ms
    Crisis detection     :200ms, 100ms
    
    section Stage 1: Orchestration
    Parallel tool calls  :300ms, 2500ms
    
    section Stage 2: Summarization
    Build raw context    :2800ms, 200ms
    Flash summarization  :3000ms, 1500ms
    
    section Stage 3: Generation
    Build DeepSeek prompt :4500ms, 100ms
    DeepSeek generation   :4600ms, 4000ms
    
    section Finalization
    Store conversation    :8600ms, 500ms
    Add memories         :9100ms, 300ms
    Return response      :9400ms, 100ms
```

---

## Error Handling Flow

```mermaid
flowchart TD
    Start[API Request] --> Try{Try block}
    
    Try --> Auth{Auth valid?}
    Auth -->|No| AuthError[401 Unauthorized]
    Auth -->|Yes| Orchestrate{Orchestrate}
    
    Orchestrate -->|Timeout > 5s| Timeout[Timeout error]
    Orchestrate -->|Success| Summarize{Summarize}
    
    Timeout --> FallbackContext[Use empty context]
    FallbackContext --> DeepSeek
    
    Summarize -->|Gemini quota exceeded| QuotaError[Rate limit error]
    Summarize -->|Success| DeepSeek{Generate response}
    
    QuotaError --> FallbackSummary[Use truncated raw context]
    FallbackSummary --> DeepSeek
    
    DeepSeek -->|Ollama down| OllamaError[Service unavailable]
    DeepSeek -->|Success| StoreDB{Store in DB}
    
    OllamaError --> FallbackResponse["Generic response:<br/>'I'm having trouble right now'"]
    FallbackResponse --> Return
    
    StoreDB -->|DB error| LogError[Log error<br/>Continue anyway]
    StoreDB -->|Success| AddMem{Add memories}
    
    LogError --> Return
    AddMem -->|Mem0 error| LogMemError[Log error<br/>Continue anyway]
    AddMem -->|Success| Return
    
    LogMemError --> Return
    Return[Return to user]
    
    AuthError --> ErrorResponse([Error response])
    
    style AuthError fill:#ea4335,color:#fff
    style Timeout fill:#ff9800
    style QuotaError fill:#ff9800
    style OllamaError fill:#ea4335,color:#fff
```

---

## Tool Selection Logic

```mermaid
flowchart TD
    UserMessage[User Message] --> Analyze[Flash analyzes intent]
    
    Analyze --> Always[Always Execute]
    Always --> T1[searchMemories<br/>Mem0]
    Always --> T2[getUserProfile<br/>Database]
    Always --> T3[getFitbitHealthData<br/>7 days historical]
    Always --> T4[getRecentWellness<br/>30 min intraday]
    
    Analyze --> Conditional{Check message type}
    
    Conditional -->|Educational query| RAGYes["queryRAG = YES<br/>Examples:<br/>- 'What is CBT?'<br/>- 'How to cope with anxiety?'<br/>- 'Tell me about mindfulness'"]
    
    Conditional -->|Personal chat| RAGNo["queryRAG = NO<br/>Examples:<br/>- 'I'm feeling sad'<br/>- 'Hello'<br/>- 'How am I doing?'"]
    
    RAGYes --> ExecuteRAG[Execute queryRAG<br/>Search Pinecone]
    RAGNo --> Skip[Skip queryRAG]
    
    T1 --> CheckFitbit{Fitbit data exists?}
    T2 --> CheckFitbit
    T3 --> CheckFitbit
    T4 --> CheckFitbit
    
    CheckFitbit -->|Yes| AIAnalysis[Execute analyzeHealthWithAI<br/>Generate insights]
    CheckFitbit -->|No| SkipAI[Skip AI analysis]
    
    ExecuteRAG --> Summarize
    Skip --> Summarize
    AIAnalysis --> Summarize
    SkipAI --> Summarize
    
    Summarize[Flash Summarizer<br/>Combine all context]
    
    style Always fill:#34a853,color:#fff
    style RAGYes fill:#4285f4,color:#fff
    style RAGNo fill:#9e9e9e,color:#fff
```

---

## Monitoring & Observability

```mermaid
graph LR
    subgraph "Application Metrics"
        ResponseTime[Response Time<br/>Tracking]
        ErrorRate[Error Rate<br/>Monitoring]
        TokenUsage[Token Usage<br/>Gemini + Ollama]
    end
    
    subgraph "Tool Metrics"
        ToolLatency[Tool Execution<br/>Latency]
        ToolSuccess[Tool Success<br/>Rate]
        ParallelPerf[Parallel Execution<br/>Performance]
    end
    
    subgraph "User Metrics"
        ActiveUsers[Active Users<br/>Daily/Weekly]
        MessageVolume[Message Volume]
        CrisisCount[Crisis Detections<br/>Regular + Severe]
    end
    
    subgraph "Health Metrics"
        FitbitConnections[Fitbit<br/>Connections]
        DataFreshness[Data Freshness<br/>Last sync time]
        IntradaySuccess[Intraday API<br/>Success Rate]
    end
    
    subgraph "Logging"
        ConsoleLog[Console Logs<br/>Vercel]
        ErrorLog[Error Tracking<br/>Sentry]
        AuditLog[Audit Trail<br/>Supabase]
    end
    
    ResponseTime --> Dashboard
    ErrorRate --> Dashboard
    TokenUsage --> Dashboard
    ToolLatency --> Dashboard
    ToolSuccess --> Dashboard
    ActiveUsers --> Dashboard
    CrisisCount --> AlertSystem
    
    Dashboard[Monitoring<br/>Dashboard]
    AlertSystem[Alert System<br/>Crisis notifications]
    
    style Dashboard fill:#4285f4,color:#fff
    style AlertSystem fill:#ea4335,color:#fff
```

---

## How to Use These Diagrams

### In GitHub/GitLab
These Mermaid diagrams will render automatically in:
- GitHub README files
- GitLab documentation
- Notion (with Mermaid block)
- Obsidian (with Mermaid plugin)

### In Documentation Sites
Use tools like:
- **Docusaurus**: Native Mermaid support
- **VitePress**: Mermaid plugin
- **MkDocs**: Mermaid2 plugin

### Export as Images
Use online tools:
- https://mermaid.live - Render and export as PNG/SVG
- https://mermaid.ink - Generate image URLs

### In Presentations
- Export diagrams as SVG
- Import into Google Slides, PowerPoint, or Keynote
- Maintain vector quality for scaling

---

**Built for the DTL Mental Health Chatbot**  
*Visualizing the multi-agent AI architecture*
