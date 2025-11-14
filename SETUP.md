# DTL Mental Health Chatbot - Setup Guide

A personalized, ethical AI companion that combines wearable health metrics, contextual knowledge, and advanced AI to provide holistic mental health support for the RVCE community.

## Features

- 🔐 **Secure Authentication** - Supabase-powered user authentication
- 👤 **Personalized Profiles** - Username-based thread management for AI memory
- 🏥 **Wearable Integration** - Real-time physiological data tracking
- 🧠 **AI-Powered Analysis** - Advanced LLM correlation between queries and health metrics
- 🔒 **Privacy-First Design** - Federated learning and differential privacy
- ❤️ **Ethical AI** - Transparent, dependency-preventing design

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account ([sign up here](https://supabase.com))

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**

   - Create a new project in [Supabase Dashboard](https://app.supabase.com)
   - Go to Project Settings > API
   - Copy your project URL and anon key

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   ```
   
   Edit `.env.local` and add your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

4. **Set up Supabase database**

   Run this SQL in your Supabase SQL Editor:
   ```sql
   -- Enable Row Level Security
   CREATE TABLE IF NOT EXISTS public.profiles (
     id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
     username TEXT UNIQUE NOT NULL,
     thread_name TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
   );

   -- Enable RLS
   ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Users can view own profile"
     ON public.profiles FOR SELECT
     USING (auth.uid() = id);

   CREATE POLICY "Users can update own profile"
     ON public.profiles FOR UPDATE
     USING (auth.uid() = id);

   -- Create trigger to auto-create profile on signup
   CREATE OR REPLACE FUNCTION public.handle_new_user()
   RETURNS TRIGGER AS $$
   BEGIN
     INSERT INTO public.profiles (id, username, thread_name)
     VALUES (
       NEW.id,
       NEW.raw_user_meta_data->>'username',
       NEW.raw_user_meta_data->>'thread_name'
     );
     RETURN NEW;
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;

   CREATE TRIGGER on_auth_user_created
     AFTER INSERT ON auth.users
     FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
dtl-mental-health-chatbot/
├── app/
│   ├── page.tsx           # Landing page
│   ├── login/page.tsx     # Login page
│   ├── signup/page.tsx    # Sign up page
│   ├── dashboard/page.tsx # User dashboard
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── lib/
│   └── supabase/
│       ├── client.ts      # Supabase client (browser)
│       └── server.ts      # Supabase client (server)
└── .env.local.example     # Environment template
```

## Core Principles

- **AI-Augmented Care** - AI assists, never replaces professional help
- **Privacy by Design** - Federated learning & differential privacy
- **Ethical & Transparent** - Clear AI identity with dependency prevention
- **Expert-Validated** - Built with psychological experts using CBT methods

## Technologies

- Next.js 16, React 19, TypeScript
- Supabase (Auth & Database)
- Tailwind CSS, Lucide React

---

Built with ❤️ for mental health support
