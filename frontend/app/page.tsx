'use client';

import React from 'react';
import { Heart, Activity, Brain, Shield, Users, Sparkles, ArrowRight, Lock, UserPlus, LogIn, Zap, TrendingUp, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import ThemeToggle from '@/components/ThemeToggle';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background aurora-bg">
      {/* Floating Theme Toggle */}
      <div className="fixed top-6 right-6 z-50">
        <ThemeToggle />
      </div>
      
      {/* Hero Section - Modern Spotlight Design */}
      <header className="relative container mx-auto px-6 py-24 md:py-32 max-w-7xl">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-muted-foreground">AI-Powered Mental Health Support</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1]">
              Your Mental Health{' '}
              <span className="bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Compass
              </span>
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed max-w-xl">
              A personalized AI companion combining wearable health data, evidence-based guidance, 
              and empathetic support for the RVCE community.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/signup" 
                className={cn(
                  "group relative px-8 py-4 rounded-xl font-semibold",
                  "bg-linear-to-r from-primary to-secondary text-white",
                  "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40",
                  "transition-all duration-300 hover:-translate-y-0.5",
                  "inline-flex items-center gap-2"
                )}
              >
                <UserPlus className="w-5 h-5" />
                Start Your Journey
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                href="/login" 
                className={cn(
                  "px-8 py-4 rounded-xl font-semibold",
                  "glass border-2 border-border hover:border-primary/50",
                  "transition-all duration-300 hover:-translate-y-0.5",
                  "inline-flex items-center gap-2"
                )}
              >
                <LogIn className="w-5 h-5" />
                Login
              </Link>
            </div>
          </div>

          {/* Right: Visual Element - Abstract Floating Cards */}
          <div className="relative h-[500px] hidden md:block">
            <div className="absolute inset-0 grid grid-cols-2 gap-4 animate-float">
              <div className={cn(
                "glass rounded-2xl p-6 space-y-4",
                "hover:scale-105 transition-transform duration-300"
              )}>
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-primary to-primary-dark flex items-center justify-center">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Real-time Health</h3>
                <p className="text-sm text-muted-foreground">Fitbit integration for holistic insights</p>
              </div>
              
              <div className={cn(
                "glass rounded-2xl p-6 space-y-4 mt-12",
                "hover:scale-105 transition-transform duration-300"
              )}>
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-secondary to-accent flex items-center justify-center">
                  <Brain className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg">AI Memory</h3>
                <p className="text-sm text-muted-foreground">Personalized context across sessions</p>
              </div>
              
              <div className={cn(
                "glass rounded-2xl p-6 space-y-4",
                "hover:scale-105 transition-transform duration-300"
              )}>
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-accent to-primary flex items-center justify-center">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Crisis Support</h3>
                <p className="text-sm text-muted-foreground">24/7 emergency detection</p>
              </div>
              
              <div className={cn(
                "glass rounded-2xl p-6 space-y-4 mt-12",
                "hover:scale-105 transition-transform duration-300"
              )}>
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-secondary to-primary flex items-center justify-center">
                  <Heart className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg">Privacy First</h3>
                <p className="text-sm text-muted-foreground">Your data stays secure</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Bento Grid - Key Features */}
      <section className="container mx-auto px-6 py-20 max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Comprehensive Mental Health Support
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Combining cutting-edge AI, wearable data, and evidence-based practices
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-6 auto-rows-fr">
          {/* Large Feature - Span 2 columns */}
          <BentoCard
            className="md:col-span-2 md:row-span-2"
            icon={<Activity className="w-8 h-8 text-primary" />}
            title="Wearable Integration"
            description="Connect your Fitbit to get AI-powered correlations between your physical health and mental wellbeing. Track sleep, activity, and heart rate patterns."
            gradient="from-primary/10 to-secondary/10"
          />
          
          <BentoCard
            icon={<Brain className="w-8 h-8 text-secondary" />}
            title="AI-Powered Memory"
            description="Your AI remembers past conversations, goals, and patterns to provide truly personalized support."
            gradient="from-secondary/10 to-accent/10"
          />
          
          <BentoCard
            icon={<Shield className="w-8 h-8 text-accent" />}
            title="Privacy-First Design"
            description="End-to-end encryption, secure storage, and you control your data."
            gradient="from-accent/10 to-primary/10"
          />
          
          <BentoCard
            className="md:col-span-2"
            icon={<TrendingUp className="w-8 h-8 text-primary" />}
            title="Evidence-Based Guidance"
            description="RAG system retrieves mental health research and CBT techniques from curated documents to provide scientifically-backed advice."
            gradient="from-primary/10 via-secondary/10 to-accent/10"
          />
          
          <BentoCard
            icon={<Heart className="w-8 h-8 text-rose-500" />}
            title="Crisis Detection"
            description="Automatic emergency resource display and contact alerts when severe distress is detected."
            gradient="from-rose-500/10 to-pink-500/10"
          />
        </div>
      </section>

      {/* Core Principles - Hover Cards */}
      <section className="container mx-auto px-6 py-20 max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            Our Core Principles
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Built on trust, transparency, and therapeutic best practices
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          <PrincipleCard
            icon={<Brain className="w-8 h-8 text-indigo-500" />}
            title="AI-Augmented Care"
            description="AI assists and enhances human care through data analysis and personalized support, never replacing professional help."
          />
          <PrincipleCard
            icon={<Shield className="w-8 h-8 text-emerald-500" />}
            title="Privacy & Security"
            description="Your health data is encrypted and securely stored. We follow industry best practices for data protection and user privacy."
          />
          <PrincipleCard
            icon={<Heart className="w-8 h-8 text-rose-500" />}
            title="Ethical & Transparent"
            description="Always clearly identified as AI with crisis detection, emergency resources, and well-being prioritization."
          />
          <PrincipleCard
            icon={<Users className="w-8 h-8 text-sky-500" />}
            title="Expert-Validated"
            description="Developed with psychological experts using clinically-validated methods like CBT and rigorous testing."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-20 max-w-7xl">
        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
            How It Works
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to start your mental health journey
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <StepCard
            number="1"
            title="Create Your Profile"
            description="Sign up with your username to create a personalized thread for AI memory and context"
          />
          <StepCard
            number="2"
            title="Connect & Share"
            description="Link your wearable devices and start conversations with our AI companion"
          />
          <StepCard
            number="3"
            title="Get Personalized Support"
            description="Receive tailored insights based on comprehensive analysis of your data and context"
          />
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-16 max-w-7xl">
        <div className="grid md:grid-cols-4 gap-6 text-center">
          <StatCard number="100%" label="Privacy Protected" />
          <StatCard number="24/7" label="AI Support" />
          <StatCard number="RVCE" label="Community Focused" />
          <StatCard number="Ethical" label="AI Design" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20 max-w-7xl">
        <div className={cn(
          "relative overflow-hidden rounded-3xl p-12 text-center text-white",
          "bg-linear-to-br from-primary via-secondary to-accent"
        )}>
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl md:text-5xl font-bold">Ready to Start Your Mental Health Journey?</h2>
            <p className="text-xl opacity-90 max-w-2xl mx-auto">
              Join our community and experience personalized, ethical AI-powered mental health support
            </p>
            <Link 
              href="/signup" 
              className={cn(
                "inline-block bg-white text-primary px-8 py-4 rounded-xl font-bold text-lg",
                "hover:shadow-2xl transition-all transform hover:scale-105",
                "shadow-xl"
              )}
            >
              Get Started Today
            </Link>
          </div>
          
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-muted-foreground max-w-7xl">
        <p>&copy; 2025 DTL Mental Health Chatbot. Built with privacy, ethics, and care for RVCE.</p>
      </footer>
    </div>
  );
}

// Component: Bento Card with gradient background
function BentoCard({ 
  icon, 
  title, 
  description, 
  gradient, 
  className 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
  gradient: string;
  className?: string;
}) {
  return (
    <div 
      className={cn(
        "group relative glass p-8 rounded-3xl",
        "border-2 border-border hover:border-primary/50",
        "transition-all duration-300 hover:-translate-y-1",
        "hover:shadow-xl hover:shadow-primary/10",
        className
      )}
    >
      <div className={cn(
        "absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity",
        "bg-linear-to-br", gradient
      )} />
      
      <div className="relative z-10 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-card flex items-center justify-center shadow-lg">
          {icon}
        </div>
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

// Component: Principle Card with hover effect
function PrincipleCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string; 
}) {
  return (
    <div 
      className={cn(
        "glass p-6 rounded-2xl",
        "border-2 border-border hover:border-primary/50",
        "transition-all duration-300 hover:-translate-y-1",
        "hover:shadow-lg hover:shadow-primary/5",
        "group"
      )}
    >
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-1 transition-transform group-hover:scale-110 duration-300">
          {icon}
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold">{title}</h3>
          <p className="text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Component: Step Card with number badge
function StepCard({ 
  number, 
  title, 
  description 
}: { 
  number: string; 
  title: string; 
  description: string; 
}) {
  return (
    <div className="text-center space-y-4">
      <div 
        className={cn(
          "w-16 h-16 mx-auto rounded-2xl",
          "bg-linear-to-br from-primary to-secondary",
          "text-white text-2xl font-bold",
          "flex items-center justify-center",
          "shadow-lg shadow-primary/25"
        )}
      >
        {number}
      </div>
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

// Component: Stat Card
function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="glass p-6 rounded-2xl space-y-2">
      <div className="text-4xl font-bold bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
        {number}
      </div>
      <div className="text-muted-foreground font-medium">{label}</div>
    </div>
  );
}
