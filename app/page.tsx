'use client';

import React, { useState } from 'react';
import { Heart, Activity, Brain, Shield, Users, Sparkles, Check, Lock, UserPlus, LogIn } from 'lucide-react';
import Link from 'next/link';

export default function LandingPage() {

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-cyan-900">
      {/* Hero Section */}
      <header className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-cyan-100 dark:bg-cyan-900/30 px-4 py-2 rounded-full mb-6">
            <Sparkles className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">AI-Powered Mental Health Support</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-linear-to-r from-cyan-600 to-sky-600 bg-clip-text text-transparent">
            DTL Mental Health Chatbot
          </h1>
          
          <p className="text-xl text-slate-600 dark:text-slate-300 mb-8 leading-relaxed">
            A personalized, ethical AI companion that combines wearable health metrics, 
            contextual knowledge, and advanced AI to provide holistic mental health support for the RVCE community.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/signup" className="bg-linear-to-r from-cyan-500 to-sky-500 text-white px-8 py-3 rounded-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105 inline-flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Sign Up
            </Link>
            <Link href="/login" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-8 py-3 rounded-lg font-semibold border-2 border-slate-200 dark:border-slate-700 hover:border-cyan-500 dark:hover:border-cyan-400 transition-all inline-flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Login
            </Link>
          </div>
        </div>
      </header>

      {/* Key Features Overview */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-slate-800 dark:text-slate-100">
          Comprehensive Mental Health Support
        </h2>
        <div className="grid md:grid-cols-4 gap-6">
          <FeatureCard
            icon={<Activity className="w-8 h-8 text-cyan-500" />}
            title="Wearable Integration"
            description="Real-time physiological data from your devices for comprehensive health insights"
          />
          <FeatureCard
            icon={<Brain className="w-8 h-8 text-sky-500" />}
            title="AI-Powered Analysis"
            description="Advanced LLM correlation between your queries and health metrics"
          />
          <FeatureCard
            icon={<Shield className="w-8 h-8 text-emerald-500" />}
            title="Privacy-First Design"
            description="Federated learning and differential privacy to protect your data"
          />
          <FeatureCard
            icon={<Heart className="w-8 h-8 text-rose-500" />}
            title="Personalized Care"
            description="Context-aware responses tailored to RVCE community and your unique needs"
          />
        </div>
      </section>

      {/* Core Principles */}
      <section className="container mx-auto px-6 py-16 bg-white/50 dark:bg-slate-900/50 rounded-3xl my-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-slate-800 dark:text-slate-100">
          Our Core Principles
        </h2>
        
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
          <PrincipleCard
            icon={<Brain className="w-8 h-8 text-purple-500" />}
            title="AI-Augmented Care"
            description="AI assists and enhances human care through data analysis and personalized support, never replacing professional help."
          />
          <PrincipleCard
            icon={<Shield className="w-8 h-8 text-emerald-500" />}
            title="Privacy by Design"
            description="Federated learning keeps your data on your device. Differential privacy ensures complete anonymity."
          />
          <PrincipleCard
            icon={<Heart className="w-8 h-8 text-rose-500" />}
            title="Ethical & Transparent"
            description="Always clearly identified as AI with built-in dependency prevention and well-being prioritization."
          />
          <PrincipleCard
            icon={<Users className="w-8 h-8 text-sky-500" />}
            title="Expert-Validated"
            description="Developed with psychological experts using clinically-validated methods like CBT and rigorous testing."
          />
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-6 py-16 bg-white/50 dark:bg-slate-900/50 rounded-3xl my-16">
        <h2 className="text-4xl font-bold text-center mb-12 text-slate-800 dark:text-slate-100">
          How It Works
        </h2>
        
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
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
      <section className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-4 gap-8 text-center">
          <StatCard number="100%" label="Privacy Protected" />
          <StatCard number="24/7" label="AI Support" />
          <StatCard number="RVCE" label="Community Focused" />
          <StatCard number="Ethical" label="AI Design" />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="bg-linear-to-r from-cyan-500 to-sky-500 rounded-3xl p-12 text-center text-white">
          <h2 className="text-4xl font-bold mb-4">Ready to Start Your Mental Health Journey?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join our community and experience personalized, ethical AI-powered mental health support
          </p>
          <Link href="/signup" className="inline-block bg-white text-cyan-600 px-8 py-4 rounded-lg font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105">
            Get Started Today
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-slate-600 dark:text-slate-400">
        <p>&copy; 2025 DTL Mental Health Chatbot. Built with privacy, ethics, and care.</p>
      </footer>
    </div>
  );
}

// Component: Feature Card
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-1">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-bold mb-3 text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

// Component: Principle Card
function PrincipleCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md hover:shadow-lg transition-all">
      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-1">{icon}</div>
        <div>
          <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">{title}</h3>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// Component: Step Card
function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-linear-to-br from-cyan-500 to-sky-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
        {number}
      </div>
      <h3 className="text-xl font-bold mb-2 text-slate-800 dark:text-slate-100">{title}</h3>
      <p className="text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
}

// Component: Stat Card
function StatCard({ number, label }: { number: string; label: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-md">
      <div className="text-4xl font-bold bg-linear-to-r from-cyan-600 to-sky-600 bg-clip-text text-transparent mb-2">
        {number}
      </div>
      <div className="text-slate-600 dark:text-slate-300 font-medium">{label}</div>
    </div>
  );
}
