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
          // Profile not found or error - this is OK for new users
          if (profileError.code !== 'PGRST116') { // Only log if not "no rows" error
            console.warn('Profile lookup issue:', profileError.message);
          }
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
    <div className="min-h-screen aurora-bg bg-background flex items-center justify-center px-6 py-12">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-8 transition-colors group">
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
          Back to Home
        </Link>

        {/* Login Card */}
        <div className="glass rounded-3xl shadow-2xl p-8 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Welcome Back
            </h1>
            <p className="text-muted-foreground">
              Login to continue your mental health journey
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 glass border-error/30 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                Email
              </label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your.email@example.com"
                  className="w-full pl-10 pr-4 py-3 glass rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary/50 text-foreground placeholder-muted-foreground transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 glass rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary/50 text-foreground placeholder-muted-foreground transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Forgot Password Link */}
            <div className="text-right">
              <Link href="/forgot-password" className="text-sm text-primary hover:text-primary-dark transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-linear-to-r from-primary to-secondary text-white py-3 rounded-2xl font-semibold hover:shadow-[0_8px_30px_rgb(99,102,241,0.3)] transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
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
          <p className="mt-6 text-center text-muted-foreground">
            Don't have an account?{' '}
            <Link href="/signup" className="text-primary hover:text-primary-dark font-semibold transition-colors">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}