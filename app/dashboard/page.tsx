'use client';

import React from 'react';
import { Heart, Activity, TrendingUp, Clock } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-cyan-900">
      <div className="container mx-auto px-6 py-12">
        <h1 className="text-4xl font-bold mb-8 bg-linear-to-r from-cyan-600 to-sky-600 bg-clip-text text-transparent">
          Welcome to Your Dashboard
        </h1>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <DashboardCard
            icon={<Heart className="w-8 h-8 text-rose-500" />}
            title="Mental Health Score"
            value="85%"
            subtitle="Last 7 days"
          />
          <DashboardCard
            icon={<Activity className="w-8 h-8 text-cyan-500" />}
            title="Activity Level"
            value="Active"
            subtitle="Daily average"
          />
          <DashboardCard
            icon={<TrendingUp className="w-8 h-8 text-emerald-500" />}
            title="Progress"
            value="+12%"
            subtitle="This week"
          />
          <DashboardCard
            icon={<Clock className="w-8 h-8 text-sky-500" />}
            title="Session Time"
            value="45min"
            subtitle="Today"
          />
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4 text-slate-800 dark:text-slate-100">
            Start Your Session
          </h2>
          <p className="text-slate-600 dark:text-slate-300 mb-6">
            Chat integration and wearable data coming soon...
          </p>
          <button className="bg-linear-to-r from-cyan-500 to-sky-500 text-white px-6 py-3 rounded-lg font-semibold hover:shadow-lg transition-all">
            Start Chat
          </button>
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ icon, title, value, subtitle }: { icon: React.ReactNode; title: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-6">
      <div className="flex items-start justify-between mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">{title}</h3>
      <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-1">{value}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}
