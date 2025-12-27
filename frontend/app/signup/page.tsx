'use client';

import React, { useState } from 'react';
import { Mail, Lock, User, ArrowLeft, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function SignUpPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

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

    // Validation
    if (!formData.username || !formData.email || !formData.password) {
      setError('All fields are required');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();

      // Sign up the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            username: formData.username,
            thread_name: formData.email // Use email for AI memory/agent context
          }
        }
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Create user profile with default 'student' role
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: data.user.id,
            email: formData.email,
            username: formData.username,
            role: 'student' // Default role for new signups
          });

        if (profileError) {
          console.error('Error creating profile:', profileError);
          // Don't fail the signup if profile creation fails
          // The user can still login and we'll create profile later
        }

        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up');
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

        {/* Sign Up Card */}
        <div className="glass rounded-3xl shadow-2xl p-8 hover:shadow-[0_8px_30px_rgb(99,102,241,0.15)] transition-all duration-300">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 bg-linear-to-r from-primary to-secondary bg-clip-text text-transparent">
              Create Account
            </h1>
            <p className="text-muted-foreground">
              Join our mental health support community
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 glass border-error/30 rounded-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
              <p className="text-error text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 glass border-success/30 rounded-2xl animate-in fade-in slide-in-from-top-2">
              <p className="text-success text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Account created successfully! Redirecting to login...
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                Username
              </label>
              <div className="relative group">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  className="w-full pl-10 pr-4 py-3 glass rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary/50 text-foreground placeholder-muted-foreground transition-all duration-200"
                  required
                />
              </div>
            </div>

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

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                Confirm Password
              </label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 glass rounded-2xl focus:ring-2 focus:ring-primary focus:border-primary/50 text-foreground placeholder-muted-foreground transition-all duration-200"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-linear-to-r from-primary to-secondary text-white py-3 rounded-2xl font-semibold hover:shadow-[0_8px_30px_rgb(99,102,241,0.3)] transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-muted-foreground">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary-dark font-semibold transition-colors">
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}