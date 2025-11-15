'use client';

import React, { useState, useEffect } from 'react';
import { Shield, LogOut, Users, Activity, TrendingUp, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdmin = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Verify admin role
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('role, username')
          .eq('user_id', user.id)
          .single();
        
        if (profile?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        
        setUser({ ...user, ...profile });
      } else {
        router.push('/login');
      }
      setLoading(false);
    };
    
    checkAdmin();
  }, [router]);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">TEST Admin Panel</h1>
              <p className="text-sm text-slate-400">Mental Health Chatbot Management</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.username || 'Admin'}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">
            Welcome, {user?.username || 'Admin'}!
          </h2>
          <p className="text-slate-400">
            Manage and monitor the mental health chatbot system
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <StatCard
            icon={<Users className="w-6 h-6 text-blue-400" />}
            title="Total Users"
            value="Coming Soon"
            bgColor="from-blue-500/20 to-blue-600/20"
            borderColor="border-blue-500/30"
          />
          <StatCard
            icon={<Activity className="w-6 h-6 text-green-400" />}
            title="Active Sessions"
            value="Coming Soon"
            bgColor="from-green-500/20 to-green-600/20"
            borderColor="border-green-500/30"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6 text-purple-400" />}
            title="Conversations"
            value="Coming Soon"
            bgColor="from-purple-500/20 to-purple-600/20"
            borderColor="border-purple-500/30"
          />
        </div>

        {/* Coming Soon Notice */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-700 rounded-xl p-8 border border-slate-600">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-yellow-500/20 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">
                Admin Dashboard Under Development
              </h3>
              <p className="text-slate-300 mb-4">
                The full admin panel with analytics, user management, and system controls is currently being built.
              </p>
              <div className="space-y-2">
                <h4 className="font-semibold text-white">Planned Features:</h4>
                <ul className="list-disc list-inside text-slate-300 space-y-1">
                  <li>User Management (view, edit, remove users)</li>
                  <li>Conversation Monitoring & Analytics</li>
                  <li>Mental Health Insights Dashboard</li>
                  <li>Fitbit Integration Statistics</li>
                  <li>System Configuration & Settings</li>
                  <li>Alert & Notification System</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <ActionCard
              title="View All Users"
              description="Manage student accounts"
              disabled
            />
            <ActionCard
              title="System Settings"
              description="Configure chatbot parameters"
              disabled
            />
            <ActionCard
              title="Analytics"
              description="View detailed reports"
              disabled
            />
          </div>
        </div>
      </main>
    </div>
  );
}

function StatCard({ 
  icon, 
  title, 
  value, 
  bgColor, 
  borderColor 
}: { 
  icon: React.ReactNode; 
  title: string; 
  value: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-xl p-6 border ${borderColor}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-slate-800/50 rounded-lg">
          {icon}
        </div>
      </div>
      <h3 className="text-slate-400 text-sm font-medium mb-1">{title}</h3>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}

function ActionCard({ 
  title, 
  description, 
  disabled = false 
}: { 
  title: string; 
  description: string; 
  disabled?: boolean;
}) {
  return (
    <button
      disabled={disabled}
      className={`text-left p-6 bg-slate-800 border border-slate-700 rounded-xl transition-all ${
        disabled 
          ? 'opacity-50 cursor-not-allowed' 
          : 'hover:bg-slate-750 hover:border-slate-600'
      }`}
    >
      <h4 className="text-white font-semibold mb-2">{title}</h4>
      <p className="text-slate-400 text-sm">{description}</p>
      {disabled && (
        <span className="inline-block mt-3 text-xs text-yellow-400">Coming Soon</span>
      )}
    </button>
  );
}