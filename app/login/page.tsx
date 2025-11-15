'use client';

import React, { useState } from 'react';
import { Mail, Lock, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.email || !formData.password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      if (data.user) {
        // Check user role to determine where to redirect
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          router.push('/dashboard'); // Default to dashboard if error
        } else if (profile?.role === 'admin') {
          router.push('/admin'); // Redirect admins to admin panel
        } else {
          router.push('/dashboard'); // Redirect students to dashboard
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-sky-50 to-cyan-50 dark:from-slate-900 dark:via-slate-800 dark:to-cyan-900 flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-slate-600 dark:text-slate-300 hover:text-cyan-500 dark:hover:text-cyan-400 mb-8 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        {/* Login Card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-linear-to-r from-cyan-600 to-sky-600 bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-slate-600 dark:text-slate-300">
              Login to continue your mental health journey
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder-slate-400"
                  required
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-cyan-500 to-sky-500 text-white py-3 rounded-lg font-semibold hover:shadow-lg transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Logging in...
                </>
              ) : (
                'Login'
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <p className="mt-6 text-center text-slate-600 dark:text-slate-300">
            Don't have an account?{' '}
            <Link href="/signup" className="text-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 font-semibold">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}