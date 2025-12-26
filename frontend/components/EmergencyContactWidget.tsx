'use client';

import React, { useState, useEffect } from 'react';
import { Mail, Shield, Check, X, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

export default function EmergencyContactWidget() {
  const [emergencyContact, setEmergencyContact] = useState<string | null>(null);
  const [isLinked, setIsLinked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    console.log('🔵 WIDGET: Component mounted, calling fetchEmergencyContact');
    fetchEmergencyContact();
  }, []);

  const fetchEmergencyContact = async () => {
    try {
      console.log('🔵 WIDGET: Starting fetch...');
      setLoading(true);
      setError('');
      
      console.log('🔵 WIDGET: Making GET request to /api/emergency-contact');
      const response = await fetch(`/api/emergency-contact?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      });
      
      console.log('🔵 WIDGET: Response received, status:', response.status);
      
      if (!response.ok) {
        throw new Error('Failed to fetch emergency contact');
      }
      
      const data = await response.json();
      console.log('🔵 WIDGET: Response data:', data);
      
      if (data.success) {
        console.log('✅ WIDGET: Setting state - email:', data.emergencyContactEmail, 'linked:', data.isLinked);
        setEmergencyContact(data.emergencyContactEmail);
        setIsLinked(data.isLinked);
        setEmailInput(data.emergencyContactEmail || '');
      } else {
        console.log('❌ WIDGET: Response success=false');
      }
    } catch (err: any) {
      console.error('❌ WIDGET: Error:', err);
      setError('Failed to load emergency contact');
    } finally {
      console.log('🔵 WIDGET: Setting loading=false');
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailInput || !emailRegex.test(emailInput)) {
      setError('Please enter a valid email address');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('/api/emergency-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emergencyContactEmail: emailInput }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmergencyContact(emailInput);
        setIsLinked(true);
        setEditing(false);
        setSuccess('Emergency contact linked successfully!');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to link emergency contact');
      }
    } catch (err: any) {
      setError('Failed to link emergency contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!confirm('Are you sure you want to remove your emergency contact?')) {
      return;
    }

    setSaving(true);
    setError('');

    try {
      const response = await fetch('/api/emergency-contact', {
        method: 'DELETE',
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setEmergencyContact(null);
        setIsLinked(false);
        setEmailInput('');
        setSuccess('Emergency contact removed successfully');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(data.error || 'Failed to remove emergency contact');
      }
    } catch (err: any) {
      setError('Failed to remove emergency contact. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  console.log('🔵 WIDGET: Rendering - loading:', loading, 'isLinked:', isLinked, 'email:', emergencyContact);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
          <Shield className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">
            Emergency Contact
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Crisis alert system
          </p>
        </div>
        <button
          onClick={fetchEmergencyContact}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-2">
          <Check className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
          <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
        </div>
      )}

      {!isLinked && !editing ? (
        <>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Link a trusted person who will be notified if our system detects you're in crisis.
          </p>

          <ul className="space-y-2 mb-6">
            <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-4 h-4 text-green-500" />
              Automatic crisis detection
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-4 h-4 text-green-500" />
              Instant email alerts
            </li>
            <li className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <Check className="w-4 h-4 text-green-500" />
              Emergency resources included
            </li>
          </ul>

          <button
            onClick={() => setEditing(true)}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 text-white py-3 rounded-lg font-medium hover:from-red-600 hover:to-orange-600 transition-all"
          >
            Link Emergency Contact
          </button>
        </>
      ) : editing ? (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">
              Emergency Contact Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="contact@example.com"
                className="w-full pl-10 pr-4 py-3 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                disabled={saving}
              />
            </div>
          </div>

          <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <strong>Important:</strong> This person will receive urgent alerts if you express thoughts of self-harm. Choose someone you trust.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 text-white py-2 rounded-lg font-medium hover:from-red-600 hover:to-orange-600 transition-all disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </span>
              ) : (
                'Save'
              )}
            </button>
            <button
              onClick={() => {
                setEditing(false);
                setEmailInput(emergencyContact || '');
                setError('');
              }}
              disabled={saving}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Check className="w-5 h-5 text-green-500" />
              <p className="font-medium text-green-800 dark:text-green-200">
                Emergency Contact Active
              </p>
            </div>
            <p className="text-sm text-green-700 dark:text-green-300 break-all">
              <Mail className="w-4 h-4 inline mr-1" />
              {emergencyContact}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="flex-1 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-all text-sm"
            >
              Update
            </button>
            <button
              onClick={handleRemove}
              disabled={saving}
              className="px-4 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}