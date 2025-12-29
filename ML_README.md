# Machine Learning & AI Documentation

> **Deep Dive into ML Components, Models, Training, and Hyperparameters**  
> DTL Mental Health Chatbot - AI/ML Technical Reference

---

## Table of Contents

- [Overview](#overview)
- [Model Architecture](#model-architecture)
- [Language Models](#language-models)
- [Embedding Models](#embedding-models)
- [Hyperparameters](#hyperparameters)
- [Prompt Engineering](#prompt-engineering)
- [Training & Fine-Tuning](#training--fine-tuning)
- [Model Evaluation](#model-evaluation)
- [Performance Optimization](#performance-optimization)
- [Token Management](#token-management)
- [Multi-Agent Orchestration](#multi-agent-orchestration)
- [Vector Search & Retrieval](#vector-search--retrieval)
- [Health Data AI Analysis](#health-data-ai-analysis)
- [Production Deployment](#production-deployment)

---

## Overview

The DTL Mental Health Chatbot employs a **multi-model AI architecture** combining:

1. **Google Gemini 2.5 Flash** - Fast, efficient orchestration and summarization
2. **DeepSeek via Ollama** - Empathetic response generation
3. **Nomic Embed Text** - High-quality text embeddings for RAG
4. **Mem0 AI** - Intelligent memory management with built-in embeddings

### Design Philosophy

- **Multi-stage pipeline**: Separation of concerns (orchestration → summarization → generation)
- **Token efficiency**: 95% reduction via Flash summarization before final generation
- **Speed optimization**: Parallel tool execution (2-3s vs 8-10s sequential)
- **Cost effectiveness**: Use Flash for heavy lifting, expensive models only for final output
- **Safety first**: Crisis detection before any AI processing

---

## Model Architecture

### Three-Stage Pipeline

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1: Tool Orchestration (Gemini 2.5 Flash)                 │
│ ├─ Model: gemini-2.0-flash-exp                                 │
│ ├─ Purpose: Decide which tools to call, execute in parallel    │
│ ├─ Input: User message + conversation history                  │
│ ├─ Output: Raw context data from 6 tools (~2000-4000 tokens)   │
│ ├─ Hyperparameters:                                            │
│ │  • temperature: 0.2 (deterministic tool selection)           │
│ │  • maxOutputTokens: 1024                                     │
│ │  • topP: 0.95                                                │
│ │  • topK: 40                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 2: Context Summarization (Gemini 2.5 Flash)              │
│ ├─ Model: gemini-2.0-flash-exp                                 │
│ ├─ Purpose: Compress raw context to natural language summary   │
│ ├─ Input: Raw context (2000-4000 tokens)                       │
│ ├─ Output: Concise paragraph (50-80 tokens, 95% reduction)     │
│ ├─ Hyperparameters:                                            │
│ │  • temperature: 0.3 (slightly creative summarization)        │
│ │  • maxOutputTokens: 200 (enforce brevity)                    │
│ │  • topP: 0.9                                                 │
│ │  • topK: 30                                                  │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 3: Response Generation (DeepSeek via Ollama)             │
│ ├─ Model: llama3.2 (DeepSeek R1 distilled)                     │
│ ├─ Purpose: Generate warm, empathetic mental health response   │
│ ├─ Input: Summarized context + conversation history            │
│ ├─ Output: Empathetic response (~50-100 words)                 │
│ ├─ Hyperparameters:                                            │
│ │  • temperature: 0.7 (balanced creativity/consistency)        │
│ │  • max_tokens: 2048                                          │
│ │  • top_p: 0.9                                                │
│ │  • top_k: 40                                                 │
│ │  • repeat_penalty: 1.1                                       │
│ │  • stop: ["User:", "Assistant:"]                             │
└─────────────────────────────────────────────────────────────────┘
```

### Why Multi-Model?

| Requirement | Solution | Model |
|------------|----------|-------|
| Fast tool orchestration | Gemini Flash (low latency) | gemini-2.0-flash-exp |
| Cost-effective context compression | Gemini Flash (cheap, fast) | gemini-2.0-flash-exp |
| Empathetic mental health responses | DeepSeek (trained for reasoning) | llama3.2 |
| High-quality embeddings | Nomic (best open-source) | nomic-embed-text |
| Intelligent memory management | Mem0 (auto-categorization) | Mem0's internal model |

---

## Language Models

### 1. Google Gemini 2.5 Flash

**Model ID**: `gemini-2.0-flash-exp`  
**Provider**: Google AI (ai.google.dev)  
**Context Window**: 1M tokens  
**Pricing**: $0.15 per 1M input tokens, $0.60 per 1M output tokens

#### Use Cases in Our System

1. **Tool Orchestration** (`flash-orchestrator.ts`)
   - Analyzes user intent
   - Decides which tools to execute
   - Determines if RAG is needed (educational vs personal queries)
   - Parallel execution of 6 tools

2. **Context Summarization** (`context-summarizer.ts`)
   - Converts structured data to natural language
   - Reduces token count by 95% (2000-4000 → 50-80 tokens)
   - Enforces paragraph format (no bullet points)
   - Preserves critical information (username, vitals, memories)

#### Hyperparameters (Orchestration)

```typescript
const generationConfig = {
  temperature: 0.2,        // Low = deterministic tool selection
  topP: 0.95,             // High = consider most likely tokens
  topK: 40,               // Moderate diversity
  maxOutputTokens: 1024,  // Sufficient for tool calls
  responseMimeType: "application/json", // Structured output
};
```

**Rationale**:
- **Temperature 0.2**: Tool orchestration requires consistency. We want the same query to trigger the same tools every time.
- **topP 0.95**: Allows some flexibility in phrasing tool arguments
- **maxOutputTokens 1024**: Tool calls are structured JSON, don't need much space

#### Hyperparameters (Summarization)

```typescript
const generationConfig = {
  temperature: 0.3,        // Slightly creative summarization
  topP: 0.9,              // Balanced token sampling
  topK: 30,               // Focused vocabulary
  maxOutputTokens: 200,   // Force conciseness
  responseMimeType: "text/plain",
};
```

**Rationale**:
- **Temperature 0.3**: Allows natural phrasing while staying factual
- **maxOutputTokens 200**: Hard limit forces Flash to be concise (actual output: 50-80 tokens)
- **topK 30**: Narrower vocabulary for medical/health context

#### System Prompts

**Orchestrator**:
```typescript
const ORCHESTRATOR_SYSTEM_PROMPT = `You are an AI orchestrator for a mental health chatbot...
Your ONLY job is to decide which tools to call based on the user's message.

ALWAYS call these tools:
1. searchMemories - retrieve relevant past conversations
2. getUserProfile - get user's name and profile
3. getFitbitHealthData - get health data from last 7 days
4. getRecentWellness - get real-time vitals from last 30 minutes

CONDITIONALLY call:
5. queryRAG - ONLY if user asks educational questions about mental health
   Examples: "What is CBT?", "How to cope with anxiety?"
   DO NOT call for personal queries: "I'm feeling sad", "How am I doing?"

ALWAYS call:
6. analyzeHealthWithAI - if Fitbit data exists, generate insights`;
```

**Summarizer**:
```typescript
const SUMMARIZER_SYSTEM_PROMPT = `You are a context summarizer for a mental health chatbot.
Convert structured data into a NATURAL, FLOWING PARAGRAPH.

CRITICAL RULES:
1. OUTPUT ONLY 1-2 SENTENCES IN PARAGRAPH FORM
2. NO structural labels (no "User Profile:", "Memories:", etc.)
3. NO bullet points or lists
4. ALWAYS start with the user's first name
5. Integrate ALL context naturally

Example:
"Sarah has a resting heart rate of 68 bpm, feels stressed about finals, 
and previously found deep breathing helpful for anxiety."`;
```

---

### 2. DeepSeek via Ollama

**Model ID**: `llama3.2` (DeepSeek R1 distilled)  
**Provider**: Self-hosted via Ollama  
**Context Window**: 128K tokens  
**Pricing**: Free (self-hosted)

#### Why DeepSeek?

- **Reasoning capabilities**: DeepSeek R1 trained with reinforcement learning for step-by-step reasoning
- **Empathy**: Fine-tuned for conversational, supportive responses
- **Privacy**: Self-hosted = no data sent to external APIs
- **Cost**: Free after initial setup

#### Hyperparameters

```typescript
const ollamaConfig = {
  model: "llama3.2",
  temperature: 0.7,        // Balanced creativity
  max_tokens: 2048,        // Enough for detailed responses
  top_p: 0.9,             // Nucleus sampling
  top_k: 40,              // Moderate diversity
  repeat_penalty: 1.1,    // Discourage repetition
  stop: ["User:", "Assistant:"], // Prevent continuing conversation
};
```

**Hyperparameter Rationale**:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| **temperature** | 0.7 | Sweet spot for empathetic responses. 0.5 = too robotic, 0.9 = too random |
| **max_tokens** | 2048 | Allows detailed responses but usually outputs 50-100 words |
| **top_p** | 0.9 | Nucleus sampling keeps responses coherent |
| **top_k** | 40 | Limits to 40 most likely tokens, prevents nonsense |
| **repeat_penalty** | 1.1 | Mild penalty to avoid repetitive phrasing |
| **stop** | `["User:", "Assistant:"]` | Prevents model from hallucinating conversation turns |

#### System Prompt Engineering

The DeepSeek prompt is dynamically built with:

1. **Base system prompt**: Role definition, tone guidelines
2. **Summarized context**: 50-80 token paragraph from Flash
3. **Conversation history**: Last 10 messages for continuity
4. **Safety instructions**: Crisis resource guidelines

```typescript
function buildDeepSeekPrompt(
  summarizedContext: string,
  conversationHistory: Array<{ role: string; content: string }>,
  hasCrisisKeywords: boolean
): string {
  const systemPrompt = `You are a warm, empathetic mental health support assistant.

Context about the user (use this to personalize your response):
${summarizedContext}

Guidelines:
- Be supportive and non-judgmental
- Keep responses under 100 words
- Reference their health data naturally if relevant
- Suggest coping strategies when appropriate
- NEVER provide medical diagnoses
- If they mention crisis keywords, acknowledge and provide 988 hotline

Tone: Warm friend who genuinely cares, not a therapist.`;

  // Add crisis resources if needed
  if (hasCrisisKeywords) {
    systemPrompt += `\n\nIMPORTANT: User mentioned concerning keywords. 
Include: "If you're in crisis, call 988 (Suicide & Crisis Lifeline)"`;
  }

  return systemPrompt;
}
```

---

## Embedding Models

### Nomic Embed Text

**Model ID**: `nomic-embed-text`  
**Provider**: Ollama (self-hosted)  
**Dimensions**: 768  
**Max Sequence Length**: 8192 tokens  
**Pricing**: Free (self-hosted)

#### Why Nomic?

- **Best open-source embeddings**: Outperforms OpenAI text-embedding-ada-002 on MTEB benchmarks
- **Long context**: 8192 tokens = can embed entire documents
- **Fast**: Optimized for local inference
- **Privacy**: No data sent to external APIs

#### Use Cases

1. **RAG Document Embeddings** (`pdf/processor.ts`)
   - Embed PDF chunks for knowledge base
   - Store in Pinecone for semantic search

2. **Query Embeddings** (`rag/query.ts`)
   - Embed user queries for similarity search
   - Match against knowledge base

#### Configuration

```typescript
// Generate embedding via Ollama
const response = await fetch("http://localhost:11434/api/embeddings", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    model: "nomic-embed-text",
    prompt: text, // Document chunk or query
  }),
});

const { embedding } = await response.json();
// Returns: Float32Array of 768 dimensions
```

#### Embedding Pipeline

```
Document Upload
    ↓
Parse PDF with Docling (extract text + structure)
    ↓
Chunk text (~500 tokens each with 50 token overlap)
    ↓
For each chunk:
    ↓
Generate embedding via Nomic (768 dimensions)
    ↓
Upsert to Pinecone with metadata:
    {
      id: "doc-123-chunk-5",
      values: [0.023, -0.145, ...], // 768-dim vector
      metadata: {
        text: "Cognitive Behavioral Therapy...",
        source: "CBT_Guide.pdf",
        page: 5,
        chunkIndex: 5
      }
    }
```

---

## Hyperparameters

### Complete Reference Table

| Stage | Model | Parameter | Value | Purpose |
|-------|-------|-----------|-------|---------|
| **Orchestration** | Gemini Flash | temperature | 0.2 | Deterministic tool selection |
| | | topP | 0.95 | High diversity for tool args |
| | | topK | 40 | Moderate token pool |
| | | maxOutputTokens | 1024 | Enough for JSON tool calls |
| **Summarization** | Gemini Flash | temperature | 0.3 | Slightly creative phrasing |
| | | topP | 0.9 | Balanced sampling |
| | | topK | 30 | Focused vocabulary |
| | | maxOutputTokens | 200 | Force conciseness |
| **Generation** | DeepSeek | temperature | 0.7 | Empathetic creativity |
| | | max_tokens | 2048 | Allow detailed responses |
| | | top_p | 0.9 | Nucleus sampling |
| | | top_k | 40 | Prevent nonsense |
| | | repeat_penalty | 1.1 | Reduce repetition |
| **Embeddings** | Nomic | dimensions | 768 | Fixed by model |
| | | max_sequence | 8192 | Long context support |
| **RAG** | Pinecone | topK | 5 | Top 5 most relevant chunks |
| | | minScore | 0.7 | Relevance threshold |
| | | metric | cosine | Similarity measure |

### Temperature Guide

```
0.0 - 0.3: Deterministic, factual
├─ 0.2: Tool orchestration (our choice)
├─ 0.3: Summarization (our choice)

0.4 - 0.6: Balanced
├─ 0.5: Technical writing

0.7 - 0.9: Creative, conversational
├─ 0.7: Empathetic responses (our choice)
├─ 0.8: Creative writing

1.0+: Highly random (not recommended)
```

---

## Prompt Engineering

### Orchestrator Prompt Design

**Goal**: Get Flash to decide which tools to call based on user intent

**Techniques Used**:

1. **Few-shot learning**: Examples of when to call RAG vs not
2. **Explicit rules**: "ALWAYS call", "CONDITIONALLY call"
3. **JSON schema enforcement**: Structured output for tool calls
4. **Intent classification**: Educational vs personal queries

```typescript
const ORCHESTRATOR_SYSTEM_PROMPT = `...
EXAMPLES:

User: "What is cognitive behavioral therapy?"
→ Call queryRAG (educational)

User: "I'm feeling anxious today"
→ DO NOT call queryRAG (personal, use memories instead)

User: "How can I improve my sleep?"
→ Call queryRAG (seeking educational content)

User: "I slept poorly last night"
→ DO NOT call queryRAG (personal report, use Fitbit data)
...`;
```

### Summarizer Prompt Design

**Goal**: Convert structured data to natural paragraph

**Techniques Used**:

1. **Output format constraints**: "ONLY 1-2 SENTENCES IN PARAGRAPH FORM"
2. **Prohibition rules**: "NO structural labels", "NO bullet points"
3. **Template guidance**: "ALWAYS start with the user's first name"
4. **Example-driven**: Show ideal output format

```typescript
const SUMMARIZER_SYSTEM_PROMPT = `...
BAD OUTPUT (structured):
"User Profile: Sarah (sarah@example.com)
Memories: Finds deep breathing helpful
Fitbit: Heart rate 68 bpm"

GOOD OUTPUT (paragraph):
"Sarah has a resting heart rate of 68 bpm, feels stressed about finals, 
and previously found deep breathing helpful for anxiety."
...`;
```

### DeepSeek Prompt Design

**Goal**: Generate warm, empathetic mental health responses

**Techniques Used**:

1. **Persona definition**: "Warm friend who genuinely cares"
2. **Tone guidelines**: Supportive, non-judgmental, under 100 words
3. **Context integration**: Summarized paragraph from Flash
4. **Safety instructions**: Crisis resource guidelines
5. **Constraint setting**: "NEVER provide medical diagnoses"

```typescript
const basePrompt = `You are a warm, empathetic mental health support assistant.

Context about the user:
${summarizedContext}

Guidelines:
- Be supportive and non-judgmental
- Keep responses under 100 words
- Reference their health data naturally if relevant
- Suggest coping strategies when appropriate
- NEVER provide medical diagnoses

Tone: Warm friend who genuinely cares, not a therapist.`;
```

### Prompt Optimization Strategies

1. **Constraint Hierarchy**:
   ```
   CRITICAL RULES (must follow)
       ↓
   Guidelines (should follow)
       ↓
   Suggestions (nice to have)
   ```

2. **Output Length Control**:
   - Summarizer: `maxOutputTokens: 200` + prompt says "1-2 sentences"
   - DeepSeek: Prompt says "under 100 words" (model usually outputs 50-70)

3. **Format Enforcement**:
   - Use negative examples ("BAD OUTPUT") + positive examples ("GOOD OUTPUT")
   - Explicit prohibitions ("NO bullet points")

4. **Context Windowing**:
   - Orchestrator: Full conversation history (needs all context to decide tools)
   - Summarizer: Only current tool outputs (no history needed)
   - DeepSeek: Last 10 messages (continuity without overload)

---

## Training & Fine-Tuning

### Current Model Status

| Model | Training Status | Notes |
|-------|----------------|-------|
| Gemini 2.5 Flash | Pre-trained (Google) | No custom fine-tuning |
| **DeepSeek R1 Distill Llama 8B** | **Fine-tuned on MentalChat16K** | **Active training (see below)** |
| Nomic Embed Text | Pre-trained (Nomic AI) | No custom fine-tuning |

### Active Fine-Tuning: DeepSeek R1 Mental Health Model

We are **currently fine-tuning** DeepSeek R1 Distill Llama 8B on mental health conversations using the MentalChat16K dataset.

#### Training Dataset: MentalChat16K

**Dataset**: [`ShenLab/MentalChat16K`](https://huggingface.co/datasets/ShenLab/MentalChat16K)

**Description**: A curated collection of 16,000+ mental health support conversations covering various topics including anxiety, depression, stress, relationship issues, and general wellness.

**Key Statistics**:
- **Total Conversations**: 16,000+
- **Split**: 95% training (15,200 samples), 5% validation (800 samples)
- **Average Length**: ~200-500 tokens per conversation
- **Topics Covered**:
  - Anxiety and panic disorders
  - Depression and mood disorders
  - Stress management
  - Relationship and family issues
  - Self-esteem and confidence
  - Sleep disorders
  - Grief and loss
  - Work-life balance
  - General wellness and mental health education

**Dataset Format**:
```json
{
  "instruction": "I'm feeling anxious about my upcoming presentation",
  "input": "",
  "output": "It's completely normal to feel anxious about presentations. Let's work through this together. First, take a deep breath..."
}
```

**Why MentalChat16K?**
1. **Domain-Specific**: Focused exclusively on mental health conversations
2. **High Quality**: Professionally curated with therapeutic best practices
3. **Diverse Topics**: Covers wide range of mental health concerns
4. **Empathetic Tone**: Responses demonstrate warmth and validation
5. **Size**: Large enough for effective fine-tuning (16K samples)

#### Fine-Tuning Implementation

**Base Model**: `unsloth/DeepSeek-R1-Distill-Llama-8B-bnb-4bit`

**Training Infrastructure**:
- Platform: Google Colab (free tier with checkpointing strategy)
- Quantization: 4-bit using bitsandbytes
- Framework: Unsloth (optimized for efficient training)
- Checkpoint Storage: Hugging Face Hub ([A5CENSION-SRT/mental-health-deepseek-v1](https://huggingface.co/A5CENSION-SRT/mental-health-deepseek-v1))

**Prompt Template** (DeepSeek Reasoning Format):
```xml
<｜User｜>{instruction} {input}<｜Assistant｜><think>
The user is seeking mental health support. I should respond with empathy and therapeutic validation.
</think>{output}<｜end of sentence｜>
```

**LoRA Configuration**:
```python
from unsloth import FastLanguageModel

model = FastLanguageModel.get_peft_model(
    model,
    r=16,                    # LoRA rank
    lora_alpha=32,          # Scaling factor (2x rank)
    lora_dropout=0,         # No dropout for stability
    bias="none",            # Don't adapt biases
    use_gradient_checkpointing="unsloth",  # Memory optimization
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",  # Attention layers
        "gate_proj", "up_proj", "down_proj",      # FFN layers
    ],
)
```

**Training Hyperparameters**:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| **max_seq_length** | 1024 | Covers most conversations without truncation |
| **batch_size** | 2 (per device) | Maximum for Colab free tier GPU memory |
| **gradient_accumulation_steps** | 4 | Effective batch size = 8 |
| **learning_rate** | 2e-4 | Standard for LoRA fine-tuning |
| **warmup_steps** | 5 | Quick warmup for small dataset |
| **max_steps** | 1800 | ~1.5 epochs over 15,200 training samples |
| **save_steps** | 100 | Checkpoint every 100 steps for Colab resilience |
| **save_total_limit** | 2 | Keep only 2 latest checkpoints locally |
| **fp16** | True (if GPU) | Mixed precision for speed |
| **bf16** | True (if supported) | Better numerical stability |
| **packing** | True | Efficient sequence packing for variable lengths |

**Training Configuration**:
```python
from trl import SFTTrainer, SFTConfig

sft_config = SFTConfig(
    output_dir="./outputs",
    dataset_text_field="text",
    max_seq_length=1024,
    packing=True,
    
    # Checkpointing strategy (Colab-resilient)
    save_strategy="steps",
    save_steps=100,
    save_total_limit=2,
    max_steps=1800,
    
    # Training hyperparameters
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    warmup_steps=5,
    
    # Mixed precision
    fp16=not is_bfloat16_supported(),
    bf16=is_bfloat16_supported(),
    
    # Hub integration
    push_to_hub=True,
    hub_model_id="A5CENSION-SRT/mental-health-deepseek-v1",
    hub_strategy="all_checkpoints",  # Push full checkpoints
)
```

**Data Preprocessing Pipeline**:

```python
from datasets import load_dataset

# 1. Load dataset
dataset = load_dataset("ShenLab/MentalChat16K", split="train")

# 2. Format with DeepSeek reasoning template
prompt_style = """<｜User｜>{input}<｜Assistant｜><think>
{reasoning}
</think>{output}<｜end of sentence｜>"""

def formatting_prompts_func(examples):
    instructions = examples.get("instruction", [""] * len(examples["output"]))
    user_inputs = examples.get("input", [""] * len(examples["output"]))
    outputs = examples.get("output", [""] * len(examples["output"]))
    
    texts = []
    for inst, user_in, output in zip(instructions, user_inputs, outputs):
        # Combine instruction and input
        full_input = f"{inst} {user_in}".strip()
        
        # Add reasoning step for mental health context
        text = prompt_style.format(
            input=full_input,
            reasoning="The user is seeking mental health support. I should respond with empathy and therapeutic validation.",
            output=output
        )
        texts.append(text)
    return {"text": texts}

# 3. Map and split (95% train, 5% validation)
dataset = dataset.map(formatting_prompts_func, batched=True)
dataset = dataset.train_test_split(test_size=0.05, seed=3407)

# Training samples: 15,200 | Eval samples: 800
```

**Checkpointing Strategy for Colab Free Tier**:

Since Colab sessions can disconnect, we use an incremental training strategy:

1. **Save Frequently**: Checkpoint every 100 steps
2. **Hub Sync**: Auto-push to Hugging Face Hub with `hub_strategy="all_checkpoints"`
3. **Resume Automatically**: Use `resume_from_checkpoint` to continue from latest
4. **State Preservation**: Checkpoints include:
   - `adapter_model.safetensors` - Learned LoRA weights
   - `optimizer.pt` - Optimizer state (momentum, learning rate)
   - `scheduler.pt` - Learning rate schedule
   - `trainer_state.json` - Current step counter

**Resume Training Example**:
```python
from huggingface_hub import snapshot_download

# Download latest checkpoint from Hub
checkpoint_to_resume = "checkpoint-500"
snapshot_download(
    repo_id="A5CENSION-SRT/mental-health-deepseek-v1",
    allow_patterns=f"{checkpoint_to_resume}/*",
    local_dir="./hf_checkpoint_cache",
)

# Resume training from Step 501
trainer.train(resume_from_checkpoint=f"./hf_checkpoint_cache/{checkpoint_to_resume}")
```

**Training Progress**:
- ✅ Checkpoint 100 (Steps 0-100)
- ✅ Checkpoint 200 (Steps 101-200)
- ✅ Checkpoint 300 (Steps 201-300)
- ✅ Checkpoint 400 (Steps 301-400)
- ✅ Checkpoint 500 (Steps 401-500)
- 🔄 In Progress: Steps 501-1800

**Anti-Disconnect Script** (Colab):
```javascript
// Run in browser console to prevent disconnections
function ClickConnect(){
    console.log("Keeping session alive...");
    document.querySelector("colab-connect-button").click();
}
setInterval(ClickConnect, 60000);  // Every 60 seconds
```

**Training Notebook**: See `python/training_deepseek.ipynb` for complete implementation.

---

### Future Fine-Tuning Roadmap

#### Phase 1: Evaluate MentalChat16K Fine-Tuned Model (Q1 2026)

**Goal**: Assess improvements from MentalChat16K fine-tuning

1. **Compare Models**:
   - Base model: `unsloth/DeepSeek-R1-Distill-Llama-8B-bnb-4bit`
   - Fine-tuned: `A5CENSION-SRT/mental-health-deepseek-v1`
   
2. **Evaluation Metrics**:
   - **Empathy Score**: Human evaluation on warmth and validation
   - **Response Quality**: Relevance and helpfulness ratings
   - **Safety**: No medical diagnoses, proper crisis handling
   - **Perplexity**: Lower = better language modeling

3. **A/B Testing**:
   - Deploy both models to production
   - 50/50 split of user traffic
   - Collect user feedback (thumbs up/down)
   - Measure engagement metrics (conversation length, return rate)

4. **Decision Criteria**:
   - If fine-tuned model shows **>10% improvement** in empathy/quality → Deploy as default
   - If marginal improvement (<10%) → Continue with additional data collection

#### Phase 2: Additional Data Collection & Domain Expansion (Q2 2026)

**Goal**: Gather high-quality conversation data for fine-tuning

1. **Collect Conversations**:
   - Store all chat interactions in Supabase
   - Track user feedback (thumbs up/down on responses)
   - Annotate conversations with quality scores

2. **Create Training Dataset**:
   ```jsonl
   {"prompt": "I'm feeling anxious about exams", "completion": "I hear you - exam anxiety is really common. Since your heart rate is elevated (72 bpm), try box breathing: inhale 4 counts, hold 4, exhale 4, hold 4. You mentioned deep breathing helped before!", "score": 5}
   {"prompt": "What is CBT?", "completion": "Cognitive Behavioral Therapy (CBT) helps you identify negative thought patterns and replace them with healthier ones. It's evidence-based for anxiety and depression. Would you like to try a CBT exercise?", "score": 5}
   ```

3. **Data Requirements**:
   - Minimum 1,000 high-quality conversations
   - Balanced across topics (anxiety, depression, stress, wellness)
   - Diverse user demographics
   - Include Fitbit data context

#### Phase 2: Fine-Tuning DeepSeek (Q2 2026)

**Goal**: Improve empathy and health data integration

**Method**: LoRA (Low-Rank Adaptation)

```python
# Fine-tuning script (planned)
from transformers import AutoModelForCausalLM, AutoTokenizer, TrainingArguments
from peft import LoraConfig, get_peft_model
from datasets import load_dataset

# Load base model
model = AutoModelForCausalLM.from_pretrained("deepseek-ai/deepseek-llm-7b-chat")
tokenizer = AutoTokenizer.from_pretrained("deepseek-ai/deepseek-llm-7b-chat")

# LoRA configuration
lora_config = LoraConfig(
    r=16,                    # Rank of LoRA matrices
    lora_alpha=32,           # Scaling factor
    target_modules=["q_proj", "v_proj"],  # Which layers to adapt
    lora_dropout=0.05,       # Dropout for regularization
    bias="none",             # Don't adapt biases
    task_type="CAUSAL_LM"
)

# Apply LoRA
model = get_peft_model(model, lora_config)

# Training arguments
training_args = TrainingArguments(
    output_dir="./deepseek-mental-health",
    num_train_epochs=3,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=4,
    learning_rate=2e-4,
    warmup_steps=100,
    logging_steps=10,
    save_steps=500,
    evaluation_strategy="steps",
    eval_steps=500,
    fp16=True,  # Mixed precision training
)

# Load dataset
dataset = load_dataset("json", data_files="mental_health_conversations.jsonl")

# Fine-tune
trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
)

trainer.train()
```

**Hyperparameters for Fine-Tuning**:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| **Learning Rate** | 2e-4 | Standard for LoRA fine-tuning |
| **Batch Size** | 4 (per device) | Balance memory and convergence |
| **Gradient Accumulation** | 4 | Effective batch size = 16 |
| **Epochs** | 3 | Avoid overfitting on small dataset |
| **LoRA Rank (r)** | 16 | Balance between expressiveness and efficiency |
| **LoRA Alpha** | 32 | 2x rank = typical scaling |
| **Dropout** | 0.05 | Mild regularization |
| **Warmup Steps** | 100 | Gradual learning rate increase |

#### Phase 3: Embedding Fine-Tuning (Q3 2026)

**Goal**: Improve mental health domain-specific retrieval

**Method**: Contrastive learning on mental health Q&A pairs

```python
from sentence_transformers import SentenceTransformer, InputExample, losses
from torch.utils.data import DataLoader

# Load base model
model = SentenceTransformer('nomic-ai/nomic-embed-text-v1')

# Create training examples
train_examples = [
    InputExample(texts=["I'm feeling anxious", "anxiety coping strategies"]),
    InputExample(texts=["Can't sleep", "insomnia treatment options"]),
    InputExample(texts=["feeling depressed", "depression support resources"]),
]

# Create DataLoader
train_dataloader = DataLoader(train_examples, shuffle=True, batch_size=16)

# Define loss (contrastive loss)
train_loss = losses.MultipleNegativesRankingLoss(model)

# Fine-tune
model.fit(
    train_objectives=[(train_dataloader, train_loss)],
    epochs=10,
    warmup_steps=100,
    output_path="./nomic-mental-health",
)
```

**Hyperparameters for Embedding Fine-Tuning**:

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| **Batch Size** | 16 | Standard for contrastive learning |
| **Epochs** | 10 | Embeddings need more iterations |
| **Warmup Steps** | 100 | Stabilize training |
| **Learning Rate** | 2e-5 | Lower than LLM fine-tuning |
| **Loss Function** | MultipleNegativesRankingLoss | Best for semantic search |

---

## Model Evaluation

### Current Evaluation Metrics

We track the following metrics in production:

#### 1. Response Quality (Manual Review)

- **Empathy Score** (1-5): How warm and supportive is the response?
- **Relevance Score** (1-5): Does it address the user's message?
- **Health Data Integration** (1-5): Does it naturally reference Fitbit data?
- **Safety** (binary): Does it avoid medical diagnoses and handle crises properly?

**Target**: Average score > 4.0 across all metrics

#### 2. Performance Metrics

| Metric | Target | Current |
|--------|--------|---------|
| **Total Response Time** | < 15 seconds | 10-12 seconds ✅ |
| **Orchestration Latency** | < 3 seconds | 2-3 seconds ✅ |
| **Summarization Latency** | < 2 seconds | 1.5 seconds ✅ |
| **Generation Latency** | < 10 seconds | 4-6 seconds ✅ |
| **Token Reduction** | > 90% | 95% ✅ |

#### 3. Tool Execution Metrics

| Tool | Success Rate Target | Avg Latency Target |
|------|-------------------|-------------------|
| searchMemories | > 99% | < 500ms |
| getUserProfile | > 99.9% | < 100ms |
| getFitbitHealthData | > 95% | < 1s |
| getRecentWellness | > 90% | < 2s |
| queryRAG | > 99% | < 800ms |
| analyzeHealthWithAI | > 95% | < 1.5s |

#### 4. Crisis Detection Metrics

- **False Positive Rate**: < 5% (don't flag normal conversations)
- **False Negative Rate**: < 1% (must catch actual crises)
- **Email Delivery Time**: < 30 seconds

### Evaluation Scripts

```typescript
// Evaluate response quality
interface ResponseEvaluation {
  empathyScore: number;      // 1-5
  relevanceScore: number;    // 1-5
  healthDataScore: number;   // 1-5
  safetyPass: boolean;       // true/false
  responseTime: number;      // milliseconds
  tokenCount: number;        // response tokens
}

async function evaluateResponse(
  userMessage: string,
  context: string,
  response: string,
  metadata: any
): Promise<ResponseEvaluation> {
  // Manual annotation by reviewers
  const empathyScore = await getHumanScore("empathy", response);
  const relevanceScore = await getHumanScore("relevance", response);
  const healthDataScore = await getHumanScore("health_integration", response);
  
  // Automated safety check
  const safetyPass = !containsMedicalDiagnosis(response) &&
                     !containsHarmfulAdvice(response);
  
  return {
    empathyScore,
    relevanceScore,
    healthDataScore,
    safetyPass,
    responseTime: metadata.responseTime,
    tokenCount: metadata.tokenCount,
  };
}
```

### Benchmark Tests

#### Test Set 1: Empathy & Emotional Support

```typescript
const empathyTests = [
  {
    input: "I'm feeling really overwhelmed with everything",
    expectedTone: "supportive, validating",
    mustInclude: ["hear you", "understandable", "not alone"],
    mustNotInclude: ["just", "simply", "try to"],
  },
  {
    input: "I failed my exam and feel like a failure",
    expectedTone: "compassionate, reframing",
    mustInclude: ["setback", "learning opportunity"],
    mustNotInclude: ["shouldn't feel", "get over it"],
  },
];
```

#### Test Set 2: Health Data Integration

```typescript
const healthDataTests = [
  {
    input: "I'm stressed out",
    context: "Heart rate: 85 bpm (elevated), HRV: low",
    expectedMention: ["elevated heart rate", "stress response"],
    expectedSuggestion: ["breathing", "relaxation"],
  },
  {
    input: "I slept terribly",
    context: "Sleep: 4 hours, deep sleep: 30 min",
    expectedMention: ["only 4 hours", "limited deep sleep"],
    expectedSuggestion: ["sleep hygiene", "routine"],
  },
];
```

#### Test Set 3: RAG Decision Accuracy

```typescript
const ragTests = [
  {
    input: "What is mindfulness meditation?",
    shouldCallRAG: true,
    reason: "Educational query about mental health concept",
  },
  {
    input: "I'm feeling anxious right now",
    shouldCallRAG: false,
    reason: "Personal emotional state, use memories instead",
  },
  {
    input: "How does CBT help with depression?",
    shouldCallRAG: true,
    reason: "Educational query about therapy technique",
  },
];
```

---

## Performance Optimization

### Token Reduction Strategy

**Problem**: Large context (2000-4000 tokens) → slow generation + high cost

**Solution**: Flash summarization reduces tokens by 95%

```
Before Summarization:
┌─────────────────────────────────────────────┐
│ Memories (5 results):                       │
│ - "User mentioned exam stress on Dec 15"    │
│ - "Deep breathing helped with anxiety"      │
│ - "Enjoys morning walks for mental clarity" │
│ - "Struggles with perfectionism"            │
│ - "Close relationship with sister Sarah"    │
│                                             │
│ User Profile:                               │
│ { username: "Alex", email: "alex@..." }     │
│                                             │
│ Fitbit Data (7 days):                       │
│ [Daily HR, steps, sleep data arrays...]     │
│                                             │
│ Recent Wellness (30 min):                   │
│ { heartRate: [68, 70, 69, 71...],          │
│   hrv: [45, 47, 46...], ... }              │
│                                             │
│ RAG Results (5 chunks):                     │
│ [Long knowledge base excerpts...]           │
│                                             │
│ Total: ~3000 tokens                         │
└─────────────────────────────────────────────┘

After Summarization:
┌─────────────────────────────────────────────┐
│ "Alex has a resting heart rate of 68 bpm,   │
│ feels stressed about finals, and previously │
│ found deep breathing helpful for anxiety."  │
│                                             │
│ Total: ~50 tokens (95% reduction)           │
└─────────────────────────────────────────────┘
```

**Impact**:
- DeepSeek generation: 8-10s → 4-6s (40% faster)
- Cost reduction: Ollama is free, but would save 95% on paid APIs
- Accuracy: Preserved (Flash extracts key info)

### Parallel Execution Optimization

**Before** (Sequential):
```typescript
// 8-10 seconds total
const memories = await searchMemories();        // 500ms
const profile = await getUserProfile();         // 100ms
const fitbit = await getFitbitHealthData();     // 1000ms
const wellness = await getRecentWellness();     // 2000ms
const rag = await queryRAG();                   // 800ms
const aiAnalysis = await analyzeHealthWithAI(); // 1500ms
// Total: 5900ms
```

**After** (Parallel):
```typescript
// 2-3 seconds total
const [memories, profile, fitbit, wellness, aiAnalysis] = await Promise.allSettled([
  searchMemories(),        // 500ms  ┐
  getUserProfile(),        // 100ms  │
  getFitbitHealthData(),   // 1000ms ├─ Execute in parallel
  getRecentWellness(),     // 2000ms │  (max time = 2000ms)
  analyzeHealthWithAI(),   // 1500ms ┘
]);
// Then conditionally call RAG (800ms)
// Total: 2800ms (3x faster!)
```

**Speedup**: 5900ms → 2800ms (52% reduction)

### Caching Strategy

```typescript
// Cache Fitbit tokens (avoid refetching every request)
const tokenCache = new Map<string, { token: string, expiresAt: number }>();

function getCachedToken(userId: string): string | null {
  const cached = tokenCache.get(userId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.token;
  }
  return null;
}

// Cache embeddings (avoid re-embedding same queries)
const embeddingCache = new Map<string, number[]>();

async function getEmbedding(text: string): Promise<number[]> {
  if (embeddingCache.has(text)) {
    return embeddingCache.get(text)!;
  }
  
  const embedding = await generateEmbedding(text);
  embeddingCache.set(text, embedding);
  return embedding;
}
```

---

## Token Management

### Token Counting

```typescript
// Estimate tokens (1 token ≈ 4 characters for English)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Precise counting (using tokenizer)
import { encoding_for_model } from "tiktoken";

function countTokens(text: string, model: string): number {
  const encoder = encoding_for_model(model);
  const tokens = encoder.encode(text);
  return tokens.length;
}
```

### Token Budget Management

| Stage | Input Tokens | Output Tokens | Total | Cost (Gemini) |
|-------|-------------|---------------|-------|---------------|
| **Orchestration** | ~500 (user msg + history) | ~200 (tool calls) | 700 | $0.0001 |
| **Summarization** | ~3000 (raw context) | ~80 (summary) | 3080 | $0.0005 |
| **Generation** | ~150 (summary + prompt) | ~100 (response) | 250 | Free (Ollama) |
| **Total per request** | ~3650 | ~380 | **4030** | **$0.0006** |

**Cost Analysis**:
- 1000 conversations = $0.60
- 10,000 conversations = $6.00
- 100,000 conversations = $60.00

**Without Summarization**:
- DeepSeek would receive 3000 tokens → slower, higher memory usage
- If using paid API (GPT-4): $0.03 per 1K input tokens = $0.09 per request
- 1000 conversations = $90 (150x more expensive!)

### Token Optimization Techniques

1. **Truncate conversation history**:
   ```typescript
   // Keep only last 10 messages (not entire chat)
   const recentHistory = conversationHistory.slice(-10);
   ```

2. **Compress Fitbit data**:
   ```typescript
   // Don't send raw arrays, compute statistics
   const fitbitSummary = {
     avgHeartRate: calculateAvg(heartRateArray),
     maxHeartRate: Math.max(...heartRateArray),
     totalSteps: sumArray(stepsArray),
     avgSleep: calculateAvg(sleepArray),
   };
   // 500 tokens → 50 tokens
   ```

3. **Filter low-relevance memories**:
   ```typescript
   // Only include memories with score > 0.7
   const relevantMemories = allMemories.filter(m => m.score > 0.7);
   ```

---

## Multi-Agent Orchestration

### Agent Roles

```
┌──────────────────────────────────────────────────────────────────┐
│ AGENT 1: Orchestrator (Gemini Flash)                            │
│ ├─ Role: Project Manager                                        │
│ ├─ Responsibility: Decide which tools to call                   │
│ ├─ Input: User message + conversation history                   │
│ ├─ Output: Tool execution results (raw data)                    │
│ ├─ Temperature: 0.2 (deterministic decisions)                   │
│ └─ Latency: ~2-3 seconds                                        │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│ AGENT 2: Summarizer (Gemini Flash)                              │
│ ├─ Role: Information Synthesizer                                │
│ ├─ Responsibility: Compress raw data to natural language        │
│ ├─ Input: Raw context from Agent 1 (~3000 tokens)               │
│ ├─ Output: Concise paragraph (~50-80 tokens)                    │
│ ├─ Temperature: 0.3 (slight creativity for natural phrasing)    │
│ └─ Latency: ~1.5 seconds                                        │
└──────────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────────┐
│ AGENT 3: Responder (DeepSeek)                                   │
│ ├─ Role: Empathetic Counselor                                   │
│ ├─ Responsibility: Generate warm, supportive response           │
│ ├─ Input: Summarized context + conversation history             │
│ ├─ Output: Final response to user (~50-100 words)               │
│ ├─ Temperature: 0.7 (empathetic, conversational)                │
│ └─ Latency: ~4-6 seconds                                        │
└──────────────────────────────────────────────────────────────────┘
```

### Why Multi-Agent vs Single Model?

| Approach | Pros | Cons |
|----------|------|------|
| **Single Model** | Simple architecture | Slow (10-15s response), expensive tokens, less specialized |
| **Multi-Agent** | Fast (10s → 6s), cheap (95% token reduction), specialized roles | Complex orchestration, more API calls |

**Our Choice**: Multi-agent for speed, cost, and specialization

### Inter-Agent Communication

```typescript
// Agent 1 → Agent 2
const rawContext = {
  memories: [...],
  profile: {...},
  fitbitData: {...},
  wellness: {...},
  ragResults: [...],
  aiInsights: {...},
};

const summarizedContext = await agent2.summarize(rawContext);
// → "Alex has a resting heart rate of 68 bpm..."

// Agent 2 → Agent 3
const finalResponse = await agent3.generate({
  context: summarizedContext,
  conversationHistory: [...],
  userMessage: "I'm feeling stressed",
});
// → "I hear you, Alex. Stress is tough..."
```

---

## Vector Search & Retrieval

### Pinecone Configuration

```typescript
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const index = pinecone.index("mental-health-rag");

// Index specifications
const indexConfig = {
  dimension: 768,              // Nomic embedding dimensions
  metric: "cosine",           // Similarity metric
  pods: 1,                    // Number of pods
  replicas: 1,                // Number of replicas
  podType: "p1.x1",          // Pod size
};
```

### Similarity Search Algorithm

```typescript
async function queryRAG(query: string, topK: number = 5): Promise<Chunk[]> {
  // 1. Generate query embedding
  const queryEmbedding = await generateEmbedding(query);
  
  // 2. Search Pinecone
  const results = await index.query({
    vector: queryEmbedding,
    topK: topK,
    includeMetadata: true,
  });
  
  // 3. Filter by similarity threshold
  const relevantChunks = results.matches
    .filter(match => match.score > 0.7)  // Only highly relevant chunks
    .map(match => ({
      text: match.metadata.text,
      source: match.metadata.source,
      page: match.metadata.page,
      score: match.score,
    }));
  
  return relevantChunks;
}
```

### Retrieval Hyperparameters

| Parameter | Value | Reasoning |
|-----------|-------|-----------|
| **topK** | 5 | Balance between context and token limit |
| **minScore** | 0.7 | High threshold for quality (cosine similarity) |
| **metric** | cosine | Best for normalized embeddings |
| **dimension** | 768 | Nomic model output |

### Re-ranking Strategy

```typescript
// Re-rank by multiple factors
function rerank(chunks: Chunk[], query: string): Chunk[] {
  return chunks
    .map(chunk => ({
      ...chunk,
      // Weighted score: 70% vector similarity + 30% keyword match
      finalScore: 0.7 * chunk.score + 0.3 * keywordMatch(chunk.text, query),
    }))
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, 3); // Return top 3 after re-ranking
}
```

---

## Health Data AI Analysis

### Fitbit Insight Generation

```typescript
interface HealthInsight {
  stressLevel: "low" | "moderate" | "high";
  anxietyRisk: "low" | "moderate" | "elevated";
  fatigueLevel: "low" | "moderate" | "high";
  sleepQuality: "poor" | "fair" | "good";
  recommendations: string[];
}

async function analyzeHealthWithAI(fitbitData: any): Promise<HealthInsight> {
  const prompt = `Analyze this health data and provide insights:

Heart Rate: ${fitbitData.avgHeartRate} bpm (resting), ${fitbitData.maxHeartRate} bpm (max)
HRV: ${fitbitData.hrvScore} ms
Sleep: ${fitbitData.totalSleep} hours (${fitbitData.deepSleep} deep)
Steps: ${fitbitData.totalSteps}
Breathing Rate: ${fitbitData.breathingRate} breaths/min

Provide:
1. Stress level (low/moderate/high)
2. Anxiety risk (low/moderate/elevated)
3. Fatigue level (low/moderate/high)
4. Sleep quality (poor/fair/good)
5. 2-3 actionable recommendations

Output as JSON.`;

  const response = await gemini.generateContent({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.1,  // Factual analysis
      responseMimeType: "application/json",
    },
  });

  return JSON.parse(response.text());
}
```

### Mental Health Indicator Algorithms

```typescript
// Calculate stress level from heart rate and HRV
function calculateStressLevel(hr: number, hrv: number): "low" | "moderate" | "high" {
  if (hr > 90 && hrv < 30) return "high";
  if (hr > 75 && hrv < 50) return "moderate";
  return "low";
}

// Calculate anxiety risk from multiple vitals
function calculateAnxietyRisk(
  hr: number,
  hrv: number,
  breathingRate: number
): "low" | "moderate" | "elevated" {
  const indicators = [
    hr > 85,              // Elevated heart rate
    hrv < 40,             // Low heart rate variability
    breathingRate > 18,   // Rapid breathing
  ];
  
  const riskFactors = indicators.filter(Boolean).length;
  
  if (riskFactors >= 2) return "elevated";
  if (riskFactors === 1) return "moderate";
  return "low";
}

// Calculate fatigue from sleep and activity
function calculateFatigueLevel(
  sleepHours: number,
  deepSleepHours: number,
  steps: number
): "low" | "moderate" | "high" {
  if (sleepHours < 6 || deepSleepHours < 1) return "high";
  if (sleepHours < 7 || steps < 3000) return "moderate";
  return "low";
}
```

---

## Production Deployment

### Model Hosting

| Model | Hosting | URL | Cost |
|-------|---------|-----|------|
| Gemini Flash | Google AI API | ai.google.dev | Pay-per-token |
| DeepSeek (llama3.2) | Ollama (self-hosted) | localhost:11434 | Free (compute only) |
| Nomic Embed | Ollama (self-hosted) | localhost:11434 | Free (compute only) |
| Mem0 | Mem0 Cloud | api.mem0.ai | Free tier (10K ops/month) |

### Infrastructure Requirements

```yaml
# Ollama Server Specs (Recommended)
CPU: 4 cores (8 threads)
RAM: 16 GB minimum, 32 GB recommended
GPU: NVIDIA RTX 3060 (12GB VRAM) or better
  - For faster inference (~2s vs 6s on CPU)
  - Supports multiple concurrent requests
Storage: 50 GB SSD (for models)

# Models to download
ollama pull llama3.2          # ~4 GB
ollama pull nomic-embed-text  # ~275 MB
```

### Environment Variables

```bash
# .env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key
OLLAMA_BASE_URL=http://localhost:11434
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=mental-health-rag
MEM0_API_KEY=your_mem0_key
NEXT_PUBLIC_MODEL_NAME=med-assistant
```

### Monitoring & Alerts

```typescript
// Track model performance
const modelMetrics = {
  orchestrator: {
    avgLatency: 2.3,    // seconds
    errorRate: 0.001,   // 0.1%
    tokensPerRequest: 700,
  },
  summarizer: {
    avgLatency: 1.5,
    errorRate: 0.002,
    compressionRatio: 0.95,  // 95% reduction
  },
  generator: {
    avgLatency: 4.5,
    errorRate: 0.005,
    tokensPerRequest: 250,
  },
};

// Alert thresholds
const alerts = {
  latency: {
    orchestrator: 5,    // Alert if > 5s
    summarizer: 3,      // Alert if > 3s
    generator: 10,      // Alert if > 10s
  },
  errorRate: {
    threshold: 0.05,    // Alert if > 5% errors
  },
};
```

### Scaling Strategy

```
1-100 users:
  - Single Ollama instance (CPU)
  - Gemini Flash free tier
  - Pinecone free tier

100-1000 users:
  - Ollama with GPU (RTX 3060+)
  - Gemini Flash paid tier
  - Pinecone paid tier (dedicated index)

1000+ users:
  - Multiple Ollama instances (load balanced)
  - Consider fine-tuned model deployment
  - Pinecone enterprise (multi-region)
```

---

## Future ML Roadmap

### Q1 2026: Data Collection & Annotation
- [ ] Implement conversation rating system (thumbs up/down)
- [ ] Collect 1,000+ high-quality conversations
- [ ] Annotate conversations with quality scores
- [ ] Build training dataset in JSONL format

### Q2 2026: Fine-Tuning
- [ ] Fine-tune DeepSeek with LoRA on mental health conversations
- [ ] Evaluate empathy and health data integration improvements
- [ ] A/B test fine-tuned model vs base model
- [ ] Deploy fine-tuned model if performance > 10% improvement

### Q3 2026: Embedding Optimization
- [ ] Fine-tune Nomic embeddings on mental health Q&A pairs
- [ ] Evaluate retrieval quality (MRR, NDCG)
- [ ] Update Pinecone index with fine-tuned embeddings

### Q4 2026: Advanced Features
- [ ] Multi-modal support (analyze mood from voice tone)
- [ ] Predictive mental health alerts (forecast bad days)
- [ ] Personalized coping strategy recommendations
- [ ] Integration with wearables beyond Fitbit

---

## References & Resources

### Model Documentation
- [Gemini API Docs](https://ai.google.dev/docs)
- [Ollama Documentation](https://ollama.ai/docs)
- [DeepSeek GitHub](https://github.com/deepseek-ai/DeepSeek-LLM)
- [Nomic Embed Text](https://huggingface.co/nomic-ai/nomic-embed-text-v1)

### Research Papers
- ["Constitutional AI" (Anthropic, 2022)](https://arxiv.org/abs/2212.08073) - Safety alignment
- ["LoRA: Low-Rank Adaptation" (Microsoft, 2021)](https://arxiv.org/abs/2106.09685) - Fine-tuning
- ["Contrastive Learning for Embeddings"](https://arxiv.org/abs/2004.11362) - Embedding training

### Tools & Libraries
- **Transformers**: `pip install transformers` - HuggingFace models
- **PEFT**: `pip install peft` - LoRA fine-tuning
- **Sentence Transformers**: `pip install sentence-transformers` - Embedding fine-tuning
- **TikToken**: `npm install tiktoken` - Token counting

---

**Built for the DTL Mental Health Chatbot**  
*Comprehensive ML/AI technical documentation*  
*Last updated: December 29, 2025*
